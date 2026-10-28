export type Side = "left" | "right";

export const JOINTS = [
  "nose",
  "ear",
  "shoulder",
  "elbow",
  "wrist",
  "index",
  "hip",
  "knee",
  "ankle",
  "heel",
  "foot_index",
] as const;

export type Joint = (typeof JOINTS)[number];

/** A bare joint resolves to the active side; prefixed joints are fixed to one side. */
export type JointRef = Joint | `left_${Joint}` | `right_${Joint}`;

export type Metric =
  | { kind: "angle"; points: [JointRef, JointRef, JointRef] }
  | { kind: "distance"; a: JointRef; b: JointRef }
  | { kind: "ratio"; num: [JointRef, JointRef]; den: [JointRef, JointRef] }
  | {
      kind: "verticalDelta";
      a: JointRef;
      b: JointRef;
      per?: [JointRef, JointRef];
    }
  /** Segment a→b angle from horizontal: 0° = horizontal, 90° = vertical. */
  | { kind: "incline"; a: JointRef; b: JointRef };

export const REP_PHASES = [
  "idle",
  "top",
  "eccentric",
  "bottom",
  "concentric",
] as const;

export type RepPhase = (typeof REP_PHASES)[number];

export interface RangeCheck {
  message: string;
  metric: Metric;
  min?: number;
  max?: number;
}

export type FormRule =
  | ({ kind: "range"; phases?: RepPhase[] } & RangeCheck)
  | { kind: "reachedTarget"; message: string };

export const SIDE_MODES = ["auto", "both", "each", "left", "right"] as const;

/** "each" tracks left and right independently (alternating / unilateral moves). */
export type SideMode = (typeof SIDE_MODES)[number];

export const CATEGORIES = [
  "Lower body",
  "Upper body",
  "Core",
  "Cardio",
  "Holds",
  "Experimental",
  "Custom",
] as const;

export type Category = (typeof CATEGORIES)[number];

interface BaseExerciseDef {
  id: string;
  name: string;
  category: Category;
  view: "side" | "front";
  /** Camera positioning hint shown before starting. */
  setup: string;
  side: SideMode;
  /** Unreliable tracking (occlusion, lying down, small movement). */
  experimental?: boolean;
}

export interface RepExerciseDef extends BaseExerciseDef {
  type: "reps";
  primary: {
    metric: Metric;
    /** Metric value at the resting / top position. */
    start: number;
    /** Metric value that must be reached for a full rep. */
    target: number;
    hysteresis: number;
  };
  minRepDurationMs: number;
  formRules?: FormRule[];
  /**
   * Credits each rep to the side whose joint is higher/lower at the target,
   * e.g. the front leg in a lunge has the higher knee.
   */
  sideAttribution?: { joint: Joint; pick: "higher" | "lower" };
}

export interface HoldExerciseDef extends BaseExerciseDef {
  type: "hold";
  /** Timer runs while all conditions are satisfied. */
  conditions: RangeCheck[];
}

export type ExerciseDef = RepExerciseDef | HoldExerciseDef;
