import type { RepPhase } from "./types";

export interface RepConfig {
  start: number;
  target: number;
  hysteresis: number;
  minRepDurationMs: number;
}

export interface RepEvent {
  kind: "full" | "partial";
  /** Full rep number, or partial count for partial reps. */
  rep: number;
  durationMs: number;
  /** Time from leaving the top to first reaching the target. */
  eccentricMs: number;
  /** Time from last leaving the target back to the top. */
  concentricMs: number;
  /** Deepest normalized progress reached (0–1). */
  maxProgress: number;
}

// A partial rep must travel at least this far, otherwise it's treated as noise.
const MIN_PARTIAL_PROGRESS = 0.35;

/**
 * Generic rep state machine driven by normalized progress
 * (0 = at start value, 1 = at target value), so it works for rising or falling metrics.
 *
 * idle → top → eccentric → bottom → concentric → top (= rep)
 * eccentric → top without reaching bottom (= partial rep)
 */
export class RepCounter {
  phase: RepPhase = "idle";
  reps = 0;
  partials = 0;
  progress = 0;

  private readonly range: number;
  private readonly hystP: number;
  private repStartMs = 0;
  private bottomEnterMs = 0;
  private bottomExitMs = 0;
  private maxProgress = 0;

  constructor(private readonly cfg: RepConfig) {
    this.range = cfg.start - cfg.target;
    this.hystP = cfg.hysteresis / Math.abs(this.range);
  }

  update(value: number | null, timestampMs: number): RepEvent | null {
    if (value === null) return null;

    const p = (this.cfg.start - value) / this.range;
    this.progress = Math.min(1, Math.max(0, p));
    if (this.phase !== "idle" && this.phase !== "top") {
      this.maxProgress = Math.max(this.maxProgress, this.progress);
    }

    switch (this.phase) {
      case "idle":
        if (p <= 0) this.phase = "top";
        break;
      case "top":
        if (p > this.hystP) {
          this.phase = "eccentric";
          this.repStartMs = timestampMs;
          this.maxProgress = this.progress;
        }
        break;
      case "eccentric":
        if (p >= 1) {
          this.phase = "bottom";
          this.bottomEnterMs = timestampMs;
        } else if (p <= 0) {
          this.phase = "top";
          return this.finishPartial(timestampMs);
        }
        break;
      case "bottom":
        if (p < 1 - this.hystP) {
          this.phase = "concentric";
          this.bottomExitMs = timestampMs;
        }
        break;
      case "concentric":
        if (p >= 1) {
          this.phase = "bottom";
        } else if (p <= 0) {
          this.phase = "top";
          return this.finishFull(timestampMs);
        }
        break;
    }
    return null;
  }

  reset(): void {
    this.phase = "idle";
    this.reps = 0;
    this.partials = 0;
    this.progress = 0;
  }

  private finishFull(t: number): RepEvent | null {
    const durationMs = t - this.repStartMs;
    if (durationMs < this.cfg.minRepDurationMs) return null;
    this.reps++;
    return {
      kind: "full",
      rep: this.reps,
      durationMs,
      eccentricMs: this.bottomEnterMs - this.repStartMs,
      concentricMs: t - this.bottomExitMs,
      maxProgress: 1,
    };
  }

  private finishPartial(t: number): RepEvent | null {
    const durationMs = t - this.repStartMs;
    if (
      durationMs < this.cfg.minRepDurationMs ||
      this.maxProgress < MIN_PARTIAL_PROGRESS
    ) {
      return null;
    }
    this.partials++;
    return {
      kind: "partial",
      rep: this.partials,
      durationMs,
      eccentricMs: durationMs,
      concentricMs: 0,
      maxProgress: this.maxProgress,
    };
  }
}
