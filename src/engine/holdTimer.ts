import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { checkRange, issueFor, type FormIssue } from "./formChecker";
import { metricJoints, metricPoints } from "./metrics";
import { SideSelector } from "./sideSelector";
import type { HoldTrackerState, Tracker } from "./tracker";
import type { HoldExerciseDef } from "./types";

// Brief wobbles or tracking dropouts shorter than this don't pause the timer.
const GRACE_MS = 500;

export class HoldTimer {
  elapsedMs = 0;
  holding = false;
  private lastMs: number | null = null;
  private failingSince: number | null = null;

  update(ok: boolean, timestampMs: number): void {
    if (ok) {
      this.failingSince = null;
      this.holding = true;
    } else if (this.holding) {
      this.failingSince ??= timestampMs;
      if (timestampMs - this.failingSince > GRACE_MS) this.holding = false;
    }
    if (this.holding && this.lastMs !== null) {
      this.elapsedMs += timestampMs - this.lastMs;
    }
    this.lastMs = timestampMs;
  }

  reset(): void {
    this.elapsedMs = 0;
    this.holding = false;
    this.lastMs = null;
    this.failingSince = null;
  }
}

export class HoldTracker implements Tracker {
  private readonly timer = new HoldTimer();
  private readonly selector: SideSelector;

  constructor(readonly exercise: HoldExerciseDef) {
    this.selector = new SideSelector(
      exercise.side,
      exercise.conditions.flatMap((c) => metricJoints(c.metric)),
    );
  }

  update(
    landmarks: NormalizedLandmark[],
    aspect: number,
    timestampMs: number,
  ): HoldTrackerState {
    const sides = this.selector.select(landmarks);
    const issues: FormIssue[] = [];
    let inFrame = true;

    for (const cond of this.exercise.conditions) {
      const { checked, badSide } = checkRange(cond, landmarks, sides, aspect);
      if (!checked) inFrame = false;
      else if (badSide) issues.push(issueFor(cond, landmarks, badSide));
    }

    this.timer.update(inFrame && issues.length === 0, timestampMs);

    return {
      kind: "hold",
      holding: this.timer.holding,
      elapsedMs: this.timer.elapsedMs,
      inFrame,
      sides,
      trackedPoints: metricPoints(
        this.exercise.conditions[0].metric,
        landmarks,
        sides,
      ),
      issues,
    };
  }

  reset(): void {
    this.timer.reset();
  }
}
