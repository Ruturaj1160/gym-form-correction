import {
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { isVisible } from "../pose/landmarks";

// Skip face points 1-10; nose is enough for the skeleton.
const FACE_DETAIL = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

export class Overlay {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSkeleton(landmarks: NormalizedLandmark[]): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 220, 255, 0.9)";
    for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
      const a = landmarks[start];
      const b = landmarks[end];
      if (FACE_DETAIL.has(start) || FACE_DETAIL.has(end)) continue;
      if (!isVisible(a) || !isVisible(b)) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    landmarks.forEach((lm, i) => {
      if (FACE_DETAIL.has(i) || !isVisible(lm)) return;
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Draws the tracked limb chain (e.g. hip→knee→ankle) on top of the skeleton. */
  drawHighlight(points: NormalizedLandmark[], color = "#facc15"): void {
    if (points.length < 2) return;
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.lineWidth = 8;
    ctx.strokeStyle = color;
    ctx.beginPath();
    points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h),
    );
    ctx.stroke();

    ctx.fillStyle = color;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
