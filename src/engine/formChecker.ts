import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { evaluateMetric, metricJoints, resolveLandmark } from "./metrics";
import type { FormRule, RangeCheck, RepPhase, Side } from "./types";

export interface FormIssue {
  message: string;
  /** Joints involved in the violated rule, for highlighting. */
  points: NormalizedLandmark[];
}

/**
 * Evaluates a range check on each side. `checked` is false if no side was visible;
 * `badSide` is the first side out of range.
 */
export function checkRange(
  check: RangeCheck,
  landmarks: NormalizedLandmark[],
  sides: Side[],
  aspect: number,
): { checked: boolean; badSide: Side | null } {
  let checked = false;
  for (const side of sides) {
    const v = evaluateMetric(check.metric, landmarks, side, aspect);
    if (v === null) continue;
    checked = true;
    if (
      (check.min !== undefined && v < check.min) ||
      (check.max !== undefined && v > check.max)
    ) {
      return { checked, badSide: side };
    }
  }
  return { checked, badSide: null };
}

export function issueFor(
  check: RangeCheck,
  landmarks: NormalizedLandmark[],
  side: Side,
): FormIssue {
  return {
    message: check.message,
    points: metricJoints(check.metric)
      .map((ref) => resolveLandmark(landmarks, ref, side))
      .filter((lm): lm is NormalizedLandmark => lm !== null),
  };
}

type RangeRule = Extract<FormRule, { kind: "range" }>;

const ACTIVE_PHASES: RepPhase[] = ["top", "eccentric", "bottom", "concentric"];
// A violation must persist this long before it's reported (filters single-frame noise).
const DEBOUNCE_MS = 200;

interface RuleState {
  rule: RangeRule;
  violatingSince: number | null;
  checkedFrames: number;
  badFrames: number;
}

export class FormChecker {
  private readonly ranges: RuleState[];
  private readonly reachedTarget: string | null;

  constructor(rules: FormRule[] = []) {
    this.ranges = rules
      .filter((r): r is RangeRule => r.kind === "range")
      .map((rule) => ({
        rule,
        violatingSince: null,
        checkedFrames: 0,
        badFrames: 0,
      }));
    this.reachedTarget =
      rules.find((r) => r.kind === "reachedTarget")?.message ?? null;
  }

  check(
    landmarks: NormalizedLandmark[],
    sides: Side[],
    aspect: number,
    phase: RepPhase,
    timestampMs: number,
  ): FormIssue[] {
    const issues: FormIssue[] = [];

    for (const state of this.ranges) {
      const { rule } = state;
      if (!(rule.phases ?? ACTIVE_PHASES).includes(phase)) {
        state.violatingSince = null;
        continue;
      }

      const { checked, badSide } = checkRange(rule, landmarks, sides, aspect);
      if (!checked) continue;

      state.checkedFrames++;
      if (badSide === null) {
        state.violatingSince = null;
        continue;
      }

      state.badFrames++;
      state.violatingSince ??= timestampMs;
      if (timestampMs - state.violatingSince >= DEBOUNCE_MS) {
        issues.push(issueFor(rule, landmarks, badSide));
      }
    }
    return issues;
  }

  beginRep(): void {
    for (const s of this.ranges) {
      s.checkedFrames = 0;
      s.badFrames = 0;
    }
  }

  /** 0–100: average share of clean frames across rules during the rep. */
  repScore(): number {
    const scored = this.ranges.filter((s) => s.checkedFrames > 0);
    if (!scored.length) return 100;
    const clean = scored.reduce(
      (sum, s) => sum + 1 - s.badFrames / s.checkedFrames,
      0,
    );
    return Math.round((clean / scored.length) * 100);
  }

  /** Message of the rule violated the most during the rep, if any. */
  worstIssue(): string | null {
    let worst: RuleState | null = null;
    for (const s of this.ranges) {
      if (s.badFrames > 0 && (!worst || s.badFrames > worst.badFrames))
        worst = s;
    }
    return worst?.rule.message ?? null;
  }

  partialMessage(): string {
    return this.reachedTarget ?? "Partial rep — full range of motion";
  }
}
