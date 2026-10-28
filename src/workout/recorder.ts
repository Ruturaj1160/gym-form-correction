import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FeatureWindow, frameFeatures, MIN_MOTION } from "../engine/features";
import type { TrainingSample } from "../engine/recognizer";
import { downloadJson } from "../storage/localStore";

// ~10 minutes at 30 FPS; keeps memory bounded.
const MAX_FRAMES = 18_000;
const SAMPLE_STRIDE_MS = 1000;

const round = (v: number) => Math.round(v * 10_000) / 10_000;

/** Captures raw landmarks for export and window features for auto-detect training. */
export class Recorder {
  private readonly frames: { t: number; lm: number[] }[] = [];
  private readonly window = new FeatureWindow();
  readonly samples: TrainingSample[] = [];
  private t0: number | null = null;
  private lastSampleAt = 0;
  private readonly recordedAt = new Date().toISOString();

  constructor(
    readonly exerciseId: string,
    readonly exerciseName: string,
  ) {}

  get frameCount(): number {
    return this.frames.length;
  }

  add(landmarks: NormalizedLandmark[], aspect: number, t: number): void {
    this.t0 ??= t;
    if (this.frames.length < MAX_FRAMES) {
      this.frames.push({
        t: Math.round(t - this.t0),
        lm: landmarks.flatMap((p) => [
          round(p.x),
          round(p.y),
          round(p.z),
          round(p.visibility ?? 0),
        ]),
      });
    }

    this.window.push(frameFeatures(landmarks, aspect), t);
    if (t - this.lastSampleAt < SAMPLE_STRIDE_MS) return;
    const w = this.window.compute();
    if (w && w.motion >= MIN_MOTION) {
      this.samples.push({ label: this.exerciseId, f: w.vector });
      this.lastSampleAt = t;
    }
  }

  /** Call between sets so rest-time frames don't bleed into the next window. */
  breakWindow(): void {
    this.window.reset();
  }

  download(): void {
    downloadJson(`pose-${this.exerciseId}-${Date.now()}.json`, {
      format: "gym-rep-counter/pose-recording",
      version: 1,
      exerciseId: this.exerciseId,
      exerciseName: this.exerciseName,
      recordedAt: this.recordedAt,
      landmarkLayout: "33 × [x, y, z, visibility], normalized image coords",
      frames: this.frames,
    });
  }
}
