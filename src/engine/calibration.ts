import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { evaluateSides, metricJoints } from "./metrics";
import { SideSelector } from "./sideSelector";
import type { ExerciseDef, RepExerciseDef } from "./types";

export interface Calibration {
  start: number;
  target: number;
  hysteresis: number;
  calibratedAt: number;
}

const MIN_SAMPLES = 30;
// Thresholds sit this far inside the observed range so they're reliably reached.
const INSET = 0.15;
// Observed range must cover at least this share of the default range.
const MIN_RANGE_SHARE = 0.4;

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/** Records the primary metric during a few slow reps to derive personal thresholds. */
export class Calibrator {
  private readonly selector: SideSelector;
  private readonly values: number[] = [];

  constructor(readonly exercise: RepExerciseDef) {
    this.selector = new SideSelector(
      exercise.side,
      metricJoints(exercise.primary.metric),
    );
  }

  update(landmarks: NormalizedLandmark[], aspect: number): number | null {
    const sides = this.selector.select(landmarks);
    const value = evaluateSides(
      this.exercise.primary.metric,
      landmarks,
      sides,
      aspect,
    );
    if (value !== null) this.values.push(value);
    return value;
  }

  /** Robust observed range (5th–95th percentile), or null if too few samples. */
  observedRange(): { lo: number; hi: number } | null {
    if (this.values.length < MIN_SAMPLES) return null;
    const sorted = [...this.values].sort((a, b) => a - b);
    return { lo: percentile(sorted, 0.05), hi: percentile(sorted, 0.95) };
  }

  /** Returns the calibration, or an error message for the user. */
  result(): Calibration | string {
    const range = this.observedRange();
    if (!range)
      return "Not enough tracking data — make sure you're fully in frame.";

    const { start, target, hysteresis } = this.exercise.primary;
    const rising = target > start;
    const rest = rising ? range.lo : range.hi;
    const peak = rising ? range.hi : range.lo;
    const span = peak - rest;
    if (Math.abs(span) < MIN_RANGE_SHARE * Math.abs(target - start)) {
      return "Not enough movement detected — do full, slow reps.";
    }

    return {
      start: rest + INSET * span,
      target: peak - INSET * span,
      hysteresis: Math.min(hysteresis, Math.abs(span) * INSET),
      calibratedAt: Date.now(),
    };
  }
}

export function applyCalibration(
  exercise: ExerciseDef,
  calibration: Calibration | null,
): ExerciseDef {
  if (!calibration || exercise.type !== "reps") return exercise;
  const { start, target, hysteresis } = calibration;
  return {
    ...exercise,
    primary: { ...exercise.primary, start, target, hysteresis },
  };
}
