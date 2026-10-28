import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { evaluateMetric } from "./metrics";
import type { Metric, Side } from "./types";

const SIDES: Side[] = ["left", "right"];

// Per-joint angles, combined across sides as (average, |left - right|) so features are mirror-invariant.
const BILATERAL: { metric: Metric; scale: number }[] = [
  {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    scale: 180,
  },
  {
    metric: { kind: "angle", points: ["hip", "shoulder", "elbow"] },
    scale: 180,
  },
  {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    scale: 180,
  },
  { metric: { kind: "angle", points: ["hip", "knee", "ankle"] }, scale: 180 },
  {
    metric: {
      kind: "verticalDelta",
      a: "wrist",
      b: "shoulder",
      per: ["shoulder", "hip"],
    },
    scale: 2,
  },
];

const TORSO_INCLINE: Metric = { kind: "incline", a: "hip", b: "shoulder" };
const FEET_SPREAD: Metric = {
  kind: "ratio",
  num: ["left_ankle", "right_ankle"],
  den: ["left_shoulder", "right_shoulder"],
};

export const FRAME_FEATURES = BILATERAL.length * 2 + 2;

/** Per-frame pose descriptor; null entries mean the joints weren't visible. */
export function frameFeatures(
  landmarks: NormalizedLandmark[],
  aspect: number,
): (number | null)[] {
  const out: (number | null)[] = [];
  for (const { metric, scale } of BILATERAL) {
    const [l, r] = SIDES.map((s) =>
      evaluateMetric(metric, landmarks, s, aspect),
    );
    if (l !== null && r !== null) {
      out.push((l + r) / 2 / scale, Math.abs(l - r) / scale);
    } else {
      const v = l ?? r;
      out.push(v === null ? null : v / scale, null);
    }
  }
  const incline = SIDES.map((s) =>
    evaluateMetric(TORSO_INCLINE, landmarks, s, aspect),
  ).find((v) => v !== null);
  out.push(incline == null ? null : incline / 90);
  const spread = evaluateMetric(FEET_SPREAD, landmarks, "left", aspect);
  out.push(spread === null ? null : Math.min(spread, 3) / 3);
  return out;
}

const WINDOW_MS = 2000;
// Missing features get this sentinel so windows stay comparable.
const MISSING = -1;

/** Sliding window of frame features → fixed-size vector (mean, std, min, max per feature). */
export class FeatureWindow {
  private frames: { t: number; f: (number | null)[] }[] = [];

  push(features: (number | null)[], t: number): void {
    this.frames.push({ t, f: features });
    while (this.frames.length && t - this.frames[0].t > WINDOW_MS)
      this.frames.shift();
  }

  get full(): boolean {
    return (
      this.frames.length > 10 &&
      this.frames[this.frames.length - 1].t - this.frames[0].t >=
        WINDOW_MS * 0.9
    );
  }

  reset(): void {
    this.frames = [];
  }

  /** Feature vector plus a motion score (sum of std of available features). */
  compute(): { vector: number[]; motion: number } | null {
    if (!this.full) return null;
    const vector: number[] = [];
    let motion = 0;
    for (let i = 0; i < FRAME_FEATURES; i++) {
      const vals = this.frames
        .map((fr) => fr.f[i])
        .filter((v): v is number => v !== null);
      if (vals.length < this.frames.length / 2) {
        vector.push(MISSING, MISSING, MISSING, MISSING);
        continue;
      }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(
        vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length,
      );
      vector.push(mean, std, Math.min(...vals), Math.max(...vals));
      motion += std;
    }
    return { vector, motion };
  }
}

/** Below this the user is probably standing still; don't classify or train. */
export const MIN_MOTION = 0.08;
