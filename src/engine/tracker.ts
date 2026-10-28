import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FormChecker, type FormIssue } from "./formChecker";
import { HoldTracker } from "./holdTimer";
import {
  evaluateSides,
  landmarkIndex,
  metricJoints,
  metricPoints,
} from "./metrics";
import { RepCounter, type RepEvent } from "./repCounter";
import { SideSelector } from "./sideSelector";
import type { ExerciseDef, RepExerciseDef, RepPhase, Side } from "./types";

export interface RepSummary {
  event: RepEvent;
  /** 0–100 form score; partial reps score 0. */
  score: number;
  feedback: string;
  side: Side | null;
}

export interface RepTrackerState {
  kind: "reps";
  reps: number;
  partials: number;
  phase: RepPhase;
  progress: number;
  value: number | null;
  sides: Side[];
  /** Visible joints of the primary metric per side, for highlighting. */
  trackedPoints: NormalizedLandmark[][];
  issues: FormIssue[];
  /** Set only on the frame a rep (full or partial) completes. */
  rep: RepSummary | null;
  avgScore: number | null;
  /** Per-side rep counts for alternating / unilateral exercises. */
  sideCounts: Record<Side, number> | null;
}

export interface HoldTrackerState {
  kind: "hold";
  holding: boolean;
  elapsedMs: number;
  /** False when required joints aren't visible. */
  inFrame: boolean;
  sides: Side[];
  trackedPoints: NormalizedLandmark[][];
  issues: FormIssue[];
}

export type TrackerState = RepTrackerState | HoldTrackerState;

export interface Tracker {
  readonly exercise: ExerciseDef;
  update(
    landmarks: NormalizedLandmark[],
    aspect: number,
    timestampMs: number,
  ): TrackerState;
  reset(): void;
}

export function createTracker(exercise: ExerciseDef): Tracker {
  return exercise.type === "hold"
    ? new HoldTracker(exercise)
    : new RepTracker(exercise);
}

interface ChannelFrame {
  sides: Side[];
  value: number | null;
  event: RepEvent | null;
  issues: FormIssue[];
  trackedPoints: NormalizedLandmark[][];
}

/** One independent rep counter (whole body, or a single side in "each" mode). */
class RepChannel {
  readonly counter: RepCounter;
  readonly form: FormChecker;
  private readonly selector: SideSelector;
  private prevPhase: RepPhase = "idle";
  /** Side credited for the current rep, decided on reaching the target. */
  repSide: Side | null = null;

  constructor(
    private readonly ex: RepExerciseDef,
    private readonly fixedSide: Side | null,
  ) {
    this.counter = new RepCounter({
      ...ex.primary,
      minRepDurationMs: ex.minRepDurationMs,
    });
    this.selector = new SideSelector(
      fixedSide ?? ex.side,
      metricJoints(ex.primary.metric),
    );
    this.form = new FormChecker(ex.formRules);
  }

  update(
    landmarks: NormalizedLandmark[],
    aspect: number,
    t: number,
  ): ChannelFrame {
    const metric = this.ex.primary.metric;
    const sides = this.selector.select(landmarks);
    const value = evaluateSides(metric, landmarks, sides, aspect);

    const event = this.counter.update(value, t);
    const phase = this.counter.phase;
    if (this.prevPhase === "top" && phase === "eccentric") {
      this.form.beginRep();
      this.repSide = null;
    }
    if (this.prevPhase !== "bottom" && phase === "bottom") {
      this.repSide = this.fixedSide ?? this.attributeSide(landmarks);
    }
    this.prevPhase = phase;

    return {
      sides,
      value,
      event,
      issues: this.form.check(landmarks, sides, aspect, phase, t),
      trackedPoints: metricPoints(metric, landmarks, sides),
    };
  }

  reset(): void {
    this.counter.reset();
    this.prevPhase = "idle";
    this.repSide = null;
  }

  private attributeSide(landmarks: NormalizedLandmark[]): Side | null {
    const attr = this.ex.sideAttribution;
    if (!attr) return null;
    const l = landmarks[landmarkIndex(attr.joint, "left")];
    const r = landmarks[landmarkIndex(attr.joint, "right")];
    if (!l || !r) return null;
    const leftHigher = l.y < r.y;
    return (attr.pick === "higher") === leftHigher ? "left" : "right";
  }
}

class RepTracker implements Tracker {
  private readonly channels: RepChannel[];
  private scoreSum = 0;
  private sideCounts: Record<Side, number> | null;

  constructor(readonly exercise: RepExerciseDef) {
    this.channels =
      exercise.side === "each"
        ? [new RepChannel(exercise, "left"), new RepChannel(exercise, "right")]
        : [new RepChannel(exercise, null)];
    this.sideCounts = this.initialSideCounts();
  }

  update(
    landmarks: NormalizedLandmark[],
    aspect: number,
    timestampMs: number,
  ): RepTrackerState {
    const frames = this.channels.map((c) =>
      c.update(landmarks, aspect, timestampMs),
    );

    let rep: RepSummary | null = null;
    for (let i = 0; i < frames.length && !rep; i++) {
      const event = frames[i].event;
      if (event) rep = this.summarize(this.channels[i], event);
    }

    // Display the channel that is furthest into its rep.
    let active = 0;
    this.channels.forEach((c, i) => {
      if (c.counter.progress > this.channels[active].counter.progress)
        active = i;
    });
    const activeChannel = this.channels[active];
    const reps = this.channels.reduce((n, c) => n + c.counter.reps, 0);

    return {
      kind: "reps",
      reps,
      partials: this.channels.reduce((n, c) => n + c.counter.partials, 0),
      phase: activeChannel.counter.phase,
      progress: activeChannel.counter.progress,
      value: frames[active].value,
      sides: [...new Set(frames.flatMap((f) => f.sides))],
      trackedPoints: frames.flatMap((f) => f.trackedPoints),
      issues: frames.flatMap((f) => f.issues),
      rep,
      avgScore: reps ? Math.round(this.scoreSum / reps) : null,
      sideCounts: this.sideCounts && { ...this.sideCounts },
    };
  }

  reset(): void {
    this.channels.forEach((c) => c.reset());
    this.scoreSum = 0;
    this.sideCounts = this.initialSideCounts();
  }

  private initialSideCounts(): Record<Side, number> | null {
    const { side, sideAttribution } = this.exercise;
    return side === "each" || sideAttribution ? { left: 0, right: 0 } : null;
  }

  private summarize(channel: RepChannel, event: RepEvent): RepSummary {
    const side = channel.repSide;
    if (event.kind === "partial") {
      return {
        event,
        score: 0,
        feedback: channel.form.partialMessage(),
        side,
      };
    }
    const score = channel.form.repScore();
    this.scoreSum += score;
    if (side && this.sideCounts) this.sideCounts[side]++;
    const worst = channel.form.worstIssue();
    return {
      event,
      score,
      feedback: score >= 90 || !worst ? "Good rep!" : worst,
      side,
    };
  }
}
