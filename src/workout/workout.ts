import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  createTracker,
  type Tracker,
  type TrackerState,
} from "../engine/tracker";
import type { ExerciseDef } from "../engine/types";
import type {
  SessionRecord,
  SetResult,
  WorkoutPrefs,
} from "../storage/sessions";

export type WorkoutPhase = "active" | "rest" | "done";

/** Runs sets → rest → sets for one exercise. Pure logic; UI reacts via onPhaseChange. */
export class Workout {
  phase: WorkoutPhase = "active";
  setIndex = 0;
  readonly results: SetResult[] = [];
  restEndsAt = 0;

  private readonly tracker: Tracker;
  private readonly startedAt = Date.now();
  private setStartedAt: number;
  private last: TrackerState | null = null;

  constructor(
    readonly exercise: ExerciseDef,
    readonly config: WorkoutPrefs,
    now: number,
    private readonly onPhaseChange: (phase: WorkoutPhase) => void,
  ) {
    this.tracker = createTracker(exercise);
    this.setStartedAt = now;
  }

  get isLastSet(): boolean {
    return this.setIndex + 1 >= this.config.sets;
  }

  update(
    landmarks: NormalizedLandmark[],
    aspect: number,
    now: number,
  ): TrackerState | null {
    if (this.phase !== "active") return null;
    const state = this.tracker.update(landmarks, aspect, now);
    this.last = state;

    const done =
      state.kind === "hold"
        ? state.elapsedMs >= this.config.targetHoldSec * 1000
        : state.reps >= this.config.targetReps;
    if (done) this.finishSet(now);
    return state;
  }

  /** Advances the rest countdown; call every frame. */
  tick(now: number): void {
    if (this.phase === "rest" && now >= this.restEndsAt) this.startNextSet(now);
  }

  finishSet(now: number): void {
    if (this.phase !== "active") return;
    this.recordSet(now);
    if (this.isLastSet) {
      this.setPhase("done");
    } else {
      this.restEndsAt = now + this.config.restSec * 1000;
      this.setPhase("rest");
    }
  }

  restartSet(now: number): void {
    this.tracker.reset();
    this.last = null;
    this.setStartedAt = now;
  }

  skipRest(now: number): void {
    if (this.phase === "rest") this.startNextSet(now);
  }

  /** Ends early, keeping the in-progress set if it has any work in it. */
  end(now: number): void {
    if (this.phase === "active" && this.hasWork()) this.recordSet(now);
    this.setPhase("done");
  }

  toSession(): SessionRecord | null {
    if (!this.results.length) return null;
    return {
      id: crypto.randomUUID(),
      exerciseId: this.exercise.id,
      exerciseName: this.exercise.name,
      type: this.exercise.type,
      startedAt: this.startedAt,
      endedAt: Date.now(),
      sets: [...this.results],
    };
  }

  private hasWork(): boolean {
    const s = this.last;
    if (!s) return false;
    return s.kind === "hold" ? s.elapsedMs > 0 : s.reps > 0 || s.partials > 0;
  }

  private recordSet(now: number): void {
    const s = this.last;
    this.results.push({
      reps: s?.kind === "reps" ? s.reps : 0,
      partials: s?.kind === "reps" ? s.partials : 0,
      avgScore: s?.kind === "reps" ? s.avgScore : null,
      holdMs: s?.kind === "hold" ? Math.round(s.elapsedMs) : null,
      durationMs: Math.round(now - this.setStartedAt),
    });
  }

  private startNextSet(now: number): void {
    this.setIndex++;
    this.restartSet(now);
    this.setPhase("active");
  }

  private setPhase(phase: WorkoutPhase): void {
    this.phase = phase;
    this.onPhaseChange(phase);
  }
}
