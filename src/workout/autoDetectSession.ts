import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FeatureWindow, frameFeatures, MIN_MOTION } from "../engine/features";
import { KnnRecognizer } from "../engine/recognizer";
import type { ExerciseDef } from "../engine/types";
import { clearSamples, loadSamples } from "../storage/training";
import type { Banner } from "../ui/banner";

const PREDICT_EVERY_MS = 500;
const MIN_CONFIDENCE = 0.6;
// Consecutive agreeing predictions before offering to start.
const STREAK = 3;

/** Classifies the live movement with k-NN and offers to start the detected exercise. */
export class AutoDetectSession {
  private readonly window = new FeatureWindow();
  private readonly recognizer: KnnRecognizer | null = null;
  private readonly byId: Map<string, ExerciseDef>;
  private lastPredictAt = 0;
  private streakLabel: string | null = null;
  private streak = 0;
  private offered: string | null = null;

  constructor(
    private readonly banner: Banner,
    exercises: ExerciseDef[],
    private readonly onPick: (exercise: ExerciseDef) => void,
    private readonly onClose: () => void,
  ) {
    this.byId = new Map(exercises.map((e) => [e.id, e]));
    const samples = loadSamples().filter((s) => this.byId.has(s.label));

    if (!samples.length) {
      banner.show(
        "Auto-detect",
        'No training data yet. Run workouts with "Record pose data" enabled for each exercise you want detected.',
        [["Close", onClose, true]],
      );
      return;
    }

    this.recognizer = new KnnRecognizer(samples);
    const n = this.recognizer.labels.length;
    banner.show(
      "Auto-detect",
      n < 2
        ? "Only 1 exercise trained — record more exercises for useful detection. Start moving…"
        : `Trained on ${n} exercises. Start moving…`,
      this.idleActions(),
    );
  }

  update(landmarks: NormalizedLandmark[], aspect: number, now: number): void {
    if (!this.recognizer) return;
    this.window.push(frameFeatures(landmarks, aspect), now);
    if (now - this.lastPredictAt < PREDICT_EVERY_MS) return;
    this.lastPredictAt = now;

    const w = this.window.compute();
    if (!w) return;
    if (w.motion < MIN_MOTION) {
      this.streak = 0;
      if (!this.offered) this.banner.setText("Start moving…");
      return;
    }

    const p = this.recognizer.predict(w.vector);
    const ex = p && this.byId.get(p.label);
    if (!p || !ex || p.confidence < MIN_CONFIDENCE) {
      this.streak = 0;
      if (!this.offered) this.banner.setText("Not sure yet — keep going…");
      return;
    }

    this.streak = p.label === this.streakLabel ? this.streak + 1 : 1;
    this.streakLabel = p.label;
    this.banner.setText(
      `Looks like: ${ex.name} (${Math.round(p.confidence * 100)}%)`,
    );

    if (this.streak >= STREAK && this.offered !== ex.id) {
      this.offered = ex.id;
      this.banner.setActions([
        ["Cancel", this.onClose],
        [`Start ${ex.name}`, () => this.onPick(ex), true],
      ]);
    }
  }

  private idleActions(): [string, () => void][] {
    return [
      [
        "Clear training data",
        () => {
          if (!confirm("Delete all auto-detect training data?")) return;
          clearSamples();
          this.onClose();
        },
      ],
      ["Cancel", this.onClose],
    ];
  }
}
