import type { ExerciseDef } from "../engine/types";

export const jumpingJack: ExerciseDef = {
  id: "jumping-jack",
  name: "Jumping Jack",
  category: "Cardio",
  type: "reps",
  view: "front",
  setup: "Face the camera with your full body in frame.",
  side: "both",
  primary: {
    metric: { kind: "angle", points: ["hip", "shoulder", "elbow"] },
    start: 35,
    target: 140,
    hysteresis: 15,
  },
  minRepDurationMs: 300,
  formRules: [
    {
      kind: "range",
      message: "Jump your feet wider",
      metric: {
        kind: "ratio",
        num: ["left_ankle", "right_ankle"],
        den: ["left_shoulder", "right_shoulder"],
      },
      min: 1.2,
      phases: ["bottom"],
    },
    { kind: "reachedTarget", message: "Bring your arms all the way up" },
  ],
};

export const highKnees: ExerciseDef = {
  id: "high-knees",
  name: "High Knees",
  category: "Cardio",
  type: "reps",
  view: "front",
  setup: "Face the camera with your full body in frame.",
  side: "each",
  primary: {
    // Knee depth below the hip, in torso lengths.
    metric: {
      kind: "verticalDelta",
      a: "hip",
      b: "knee",
      per: ["shoulder", "hip"],
    },
    start: 0.7,
    target: 0.3,
    hysteresis: 0.08,
  },
  minRepDurationMs: 200,
  formRules: [{ kind: "reachedTarget", message: "Knees up to hip height" }],
};

export const mountainClimber: ExerciseDef = {
  id: "mountain-climber",
  name: "Mountain Climber",
  category: "Cardio",
  type: "reps",
  view: "side",
  setup: "Get into a plank side-on to a floor-level camera.",
  side: "each",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    start: 150,
    target: 110,
    hysteresis: 8,
  },
  minRepDurationMs: 200,
  formRules: [
    {
      kind: "range",
      message: "Keep your hips level",
      metric: { kind: "incline", a: "shoulder", b: "hip" },
      max: 35,
    },
    { kind: "reachedTarget", message: "Drive your knee further forward" },
  ],
};
