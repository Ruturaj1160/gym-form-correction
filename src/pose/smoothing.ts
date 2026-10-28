import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface OneEuroOptions {
  minCutoff: number;
  beta: number;
  dCutoff: number;
}

const DEFAULTS: OneEuroOptions = { minCutoff: 1.5, beta: 0.3, dCutoff: 1.0 };

function smoothingFactor(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/** One Euro filter: low lag on fast movement, strong smoothing when still. */
export class OneEuroFilter {
  private x: number | null = null;
  private dx = 0;
  private t = 0;

  constructor(private readonly opts: OneEuroOptions = DEFAULTS) {}

  filter(value: number, timestampMs: number): number {
    if (this.x === null) {
      this.x = value;
      this.t = timestampMs;
      return value;
    }
    const dt = Math.max((timestampMs - this.t) / 1000, 1e-6);
    this.t = timestampMs;

    const rawDx = (value - this.x) / dt;
    const aD = smoothingFactor(this.opts.dCutoff, dt);
    this.dx = aD * rawDx + (1 - aD) * this.dx;

    const cutoff = this.opts.minCutoff + this.opts.beta * Math.abs(this.dx);
    const a = smoothingFactor(cutoff, dt);
    this.x = a * value + (1 - a) * this.x;
    return this.x;
  }

  reset(): void {
    this.x = null;
    this.dx = 0;
  }
}

export class LandmarkSmoother {
  private filters: OneEuroFilter[][] = [];

  constructor(private readonly opts: OneEuroOptions = DEFAULTS) {}

  smooth(
    landmarks: NormalizedLandmark[],
    timestampMs: number,
  ): NormalizedLandmark[] {
    return landmarks.map((lm, i) => {
      const f = (this.filters[i] ??= [
        new OneEuroFilter(this.opts),
        new OneEuroFilter(this.opts),
        new OneEuroFilter(this.opts),
      ]);
      return {
        x: f[0].filter(lm.x, timestampMs),
        y: f[1].filter(lm.y, timestampMs),
        z: f[2].filter(lm.z, timestampMs),
        visibility: lm.visibility,
      };
    });
  }

  reset(): void {
    this.filters = [];
  }
}
