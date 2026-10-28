import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, isVisible, type LandmarkName } from "../pose/landmarks";
import type { JointRef, Metric, Side } from "./types";

export interface Point {
  x: number;
  y: number;
}

/** Angle at vertex b in degrees (0–180). */
export function angle(a: Point, b: Point, c: Point): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return NaN;
  const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function ratio(num: number, den: number): number {
  return den === 0 ? NaN : num / den;
}

/** Positive when a is above b (image y grows downward). */
export function verticalDelta(a: Point, b: Point): number {
  return b.y - a.y;
}

/** Angle of segment a→b from horizontal, 0–90°. */
export function incline(a: Point, b: Point): number {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function landmarkIndex(ref: JointRef, side: Side): number {
  if (ref === "nose") return LM.NOSE;
  const explicit = ref.match(/^(left|right)_(.+)$/);
  const [s, joint] = explicit ? [explicit[1], explicit[2]] : [side, ref];
  return LM[`${s}_${joint}`.toUpperCase() as LandmarkName];
}

export function resolveLandmark(
  landmarks: NormalizedLandmark[],
  ref: JointRef,
  side: Side,
): NormalizedLandmark | null {
  const lm = landmarks[landmarkIndex(ref, side)];
  return isVisible(lm) ? lm : null;
}

export function metricJoints(metric: Metric): JointRef[] {
  switch (metric.kind) {
    case "angle":
      return [...metric.points];
    case "distance":
      return [metric.a, metric.b];
    case "incline":
      return [metric.a, metric.b];
    case "ratio":
      return [...metric.num, ...metric.den];
    case "verticalDelta":
      return [metric.a, metric.b, ...(metric.per ?? [])];
  }
}

/**
 * Evaluates a metric on one side. Returns null if any required joint is not visible.
 * `aspect` (width / height) corrects normalized coords so angles aren't distorted.
 */
export function evaluateMetric(
  metric: Metric,
  landmarks: NormalizedLandmark[],
  side: Side,
  aspect: number,
): number | null {
  const pts: Point[] = [];
  for (const ref of metricJoints(metric)) {
    const lm = resolveLandmark(landmarks, ref, side);
    if (!lm) return null;
    pts.push({ x: lm.x * aspect, y: lm.y });
  }

  let value: number;
  switch (metric.kind) {
    case "angle":
      value = angle(pts[0], pts[1], pts[2]);
      break;
    case "distance":
      value = distance(pts[0], pts[1]);
      break;
    case "ratio":
      value = ratio(distance(pts[0], pts[1]), distance(pts[2], pts[3]));
      break;
    case "verticalDelta":
      value = verticalDelta(pts[0], pts[1]);
      if (metric.per) value = ratio(value, distance(pts[2], pts[3]));
      break;
    case "incline":
      value = incline(pts[0], pts[1]);
      break;
  }
  return Number.isFinite(value) ? value : null;
}

/** Average of the metric over the given sides that are visible. */
export function evaluateSides(
  metric: Metric,
  landmarks: NormalizedLandmark[],
  sides: Side[],
  aspect: number,
): number | null {
  let sum = 0;
  let n = 0;
  for (const s of sides) {
    const v = evaluateMetric(metric, landmarks, s, aspect);
    if (v === null) continue;
    sum += v;
    n++;
  }
  return n ? sum / n : null;
}

export function metricUnit(metric: Metric): string {
  return metric.kind === "angle" || metric.kind === "incline" ? "°" : "";
}

/** Visible joints of a metric per side, for highlighting. */
export function metricPoints(
  metric: Metric,
  landmarks: NormalizedLandmark[],
  sides: Side[],
): NormalizedLandmark[][] {
  return sides.map((s) =>
    metricJoints(metric)
      .map((ref) => resolveLandmark(landmarks, ref, s))
      .filter((lm): lm is NormalizedLandmark => lm !== null),
  );
}
