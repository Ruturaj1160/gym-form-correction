import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Calibrator, type Calibration } from "../engine/calibration";
import type { RepExerciseDef } from "../engine/types";
import { saveCalibration } from "../storage/calibration";

const DURATION_MS = 15_000;

export interface CalibrationView {
  exercise: RepExerciseDef;
  remainingMs: number;
  totalMs: number;
  value: number | null;
  range: { lo: number; hi: number } | null;
}

export type CalibrationOutcome = "saved" | "failed" | "cancelled";

/** Records a calibration window and saves the result. UI-agnostic: read state via view(). */
export class CalibrationSession {
  private readonly calibrator: Calibrator;
  private readonly endsAt: number;
  private value: number | null = null;
  private done = false;

  constructor(
    readonly exercise: RepExerciseDef,
    now: number,
    private readonly onFinish: (
      message: string,
      outcome: CalibrationOutcome,
    ) => void,
  ) {
    this.calibrator = new Calibrator(exercise);
    this.endsAt = now + DURATION_MS;
  }

  update(landmarks: NormalizedLandmark[], aspect: number): void {
    if (!this.done) this.value = this.calibrator.update(landmarks, aspect);
  }

  /** Finishes automatically when time runs out. */
  tick(now: number): void {
    if (!this.done && now >= this.endsAt) this.finish(this.calibrator.result());
  }

  view(now: number): CalibrationView {
    return {
      exercise: this.exercise,
      remainingMs: Math.max(0, this.endsAt - now),
      totalMs: DURATION_MS,
      value: this.value,
      range: this.calibrator.observedRange(),
    };
  }

  complete(): void {
    this.finish(this.calibrator.result());
  }

  cancel(): void {
    this.finish(null);
  }

  private finish(result: Calibration | string | null): void {
    if (this.done) return;
    this.done = true;
    if (result === null) {
      this.onFinish("Calibration cancelled.", "cancelled");
    } else if (typeof result === "string") {
      this.onFinish(`Calibration failed: ${result}`, "failed");
    } else {
      saveCalibration(this.exercise.id, result);
      this.onFinish(
        "Calibration saved — thresholds personalised to your range of motion.",
        "saved",
      );
    }
  }
}
