export interface TrainingSample {
  label: string;
  f: number[];
}

export interface Prediction {
  label: string;
  /** Share of distance-weighted votes for the winning label (0–1). */
  confidence: number;
}

/** k-nearest-neighbours on z-normalized window features. */
export class KnnRecognizer {
  private readonly mean: number[];
  private readonly std: number[];
  private readonly normalized: TrainingSample[];

  constructor(
    samples: TrainingSample[],
    private readonly k = 7,
  ) {
    const dims = samples[0]?.f.length ?? 0;
    this.mean = Array.from(
      { length: dims },
      (_, d) => samples.reduce((s, x) => s + x.f[d], 0) / samples.length,
    );
    this.std = Array.from({ length: dims }, (_, d) => {
      const v =
        samples.reduce((s, x) => s + (x.f[d] - this.mean[d]) ** 2, 0) /
        samples.length;
      return Math.sqrt(v) || 1;
    });
    this.normalized = samples.map((s) => ({
      label: s.label,
      f: this.normalize(s.f),
    }));
  }

  get labels(): string[] {
    return [...new Set(this.normalized.map((s) => s.label))];
  }

  predict(features: number[]): Prediction | null {
    if (!this.normalized.length || features.length !== this.mean.length)
      return null;
    const q = this.normalize(features);

    const nearest = this.normalized
      .map((s) => ({
        label: s.label,
        d: Math.hypot(...s.f.map((v, i) => v - q[i])),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.k);

    const votes = new Map<string, number>();
    let total = 0;
    for (const n of nearest) {
      const w = 1 / (n.d + 1e-6);
      votes.set(n.label, (votes.get(n.label) ?? 0) + w);
      total += w;
    }
    let best: Prediction | null = null;
    for (const [label, w] of votes) {
      if (!best || w > best.confidence) best = { label, confidence: w };
    }
    return best && { label: best.label, confidence: best.confidence / total };
  }

  private normalize(f: number[]): number[] {
    return f.map((v, i) => (v - this.mean[i]) / this.std[i]);
  }
}
