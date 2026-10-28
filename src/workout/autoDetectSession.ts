import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FeatureWindow, frameFeatures, MIN_MOTION } from "../engine/features";
import { KnnRecognizer } from "../engine/recognizer";
import type { ExerciseDef } from "../engine/types";
import { loadSamples } from "../storage/training";

const PREDICT_EVERY_MS = 500;
const MIN_CONFIDENCE = 0.6;
// Consecutive agreeing predictions before offering to start.
const STREAK = 3;

export type AutoDetectStatus = "no-data" | "waiting" | "unsure" | "detecting";

export interface AutoDetectView {
  status: AutoDetectStatus;
  trainedCount: number;
  prediction: { exercise: ExerciseDef; confidence: number } | null;
  /** Set once the same exercise has been predicted consistently. */
  ready: ExerciseDef | null;
}

/** Classifies the live movement with k-NN. UI-agnostic: read state via `view`. */
export class AutoDetectSession {
  private readonly window = new FeatureWindow();
  private readonly recognizer: KnnRecognizer | null = null;
  private readonly byId: Map<string, ExerciseDef>;
  private lastPredictAt = 0;
  private streakLabel: string | null = null;
  private streak = 0;
  view: AutoDetectView;

  constructor(exercises: ExerciseDef[]) {
    this.byId = new Map(exercises.map((e) => [e.id, e]));
    const samples = loadSamples().filter((s) => this.byId.has(s.label));
    if (samples.length) this.recognizer = new KnnRecognizer(samples);
    this.view = {
      status: this.recognizer ? "waiting" : "no-data",
      trainedCount: this.recognizer?.labels.length ?? 0,
      prediction: null,
      ready: null,
    };
  }

  /** Returns true when the view changed. */
  update(
    landmarks: NormalizedLandmark[],
    aspect: number,
    now: number,
  ): boolean {
    if (!this.recognizer) return false;
    this.window.push(frameFeatures(landmarks, aspect), now);
    if (now - this.lastPredictAt < PREDICT_EVERY_MS) return false;
    this.lastPredictAt = now;

    const w = this.window.compute();
    if (!w) return false;
    if (w.motion < MIN_MOTION) {
      this.streak = 0;
      return this.setView({ status: "waiting", prediction: null });
    }

    const p = this.recognizer.predict(w.vector);
    const exercise = p && this.byId.get(p.label);
    if (!p || !exercise || p.confidence < MIN_CONFIDENCE) {
      this.streak = 0;
      return this.setView({ status: "unsure", prediction: null });
    }

    this.streak = p.label === this.streakLabel ? this.streak + 1 : 1;
    this.streakLabel = p.label;
    return this.setView({
      status: "detecting",
      prediction: { exercise, confidence: p.confidence },
      ...(this.streak >= STREAK ? { ready: exercise } : {}),
    });
  }

  private setView(patch: Partial<AutoDetectView>): true {
    this.view = { ...this.view, ...patch };
    return true;
  }
}
