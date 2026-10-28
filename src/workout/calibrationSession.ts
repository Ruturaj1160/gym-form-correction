import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Calibrator, type Calibration } from "../engine/calibration";
import type { RepExerciseDef } from "../engine/types";
import { saveCalibration } from "../storage/calibration";
import type { Banner } from "../ui/banner";

const DURATION_MS = 15_000;

const fmt = (v: number) => (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2));

/** Drives the calibration banner and saves the result. */
export class CalibrationSession {
  private readonly calibrator: Calibrator;
  private readonly endsAt: number;
  private value: number | null = null;
  private done = false;

  constructor(
    readonly exercise: RepExerciseDef,
    private readonly banner: Banner,
    now: number,
    private readonly onFinish: (message: string) => void,
  ) {
    this.calibrator = new Calibrator(exercise);
    this.endsAt = now + DURATION_MS;
    banner.show(`Calibrating ${exercise.name}`, "", [
      ["Cancel", () => this.finish(null)],
      ["Done", () => this.finish(this.calibrator.result()), true],
    ]);
  }

  update(landmarks: NormalizedLandmark[], aspect: number): void {
    if (!this.done) this.value = this.calibrator.update(landmarks, aspect);
  }

  tick(now: number): void {
    if (this.done) return;
    if (now >= this.endsAt) {
      this.finish(this.calibrator.result());
      return;
    }
    const range = this.calibrator.observedRange();
    this.banner.setText(
      `Do 2–3 slow, full reps. ${Math.ceil((this.endsAt - now) / 1000)}s left · ` +
        `now ${this.value === null ? "--" : fmt(this.value)}` +
        (range ? ` · range ${fmt(range.lo)} – ${fmt(range.hi)}` : ""),
    );
  }

  private finish(result: Calibration | string | null): void {
    if (this.done) return;
    this.done = true;
    this.banner.hide();
    if (result === null) {
      this.onFinish("Calibration cancelled.");
    } else if (typeof result === "string") {
      this.onFinish(`Calibration failed: ${result}`);
    } else {
      saveCalibration(this.exercise.id, result);
      this.onFinish(
        "Calibration saved — thresholds personalised to your range of motion.",
      );
    }
  }
}
