import type { ExerciseDef } from "../engine/types";

export const benchPress: ExerciseDef = {
  id: "bench-press",
  name: "Bench Press",
  category: "Experimental",
  experimental: true,
  type: "reps",
  view: "side",
  setup:
    "Camera at bench height, side-on. Plates may block your arm — results vary.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    start: 155,
    target: 90,
    hysteresis: 10,
  },
  minRepDurationMs: 800,
  formRules: [
    { kind: "reachedTarget", message: "Lower the bar to your chest" },
  ],
};

export const bentOverRow: ExerciseDef = {
  id: "bent-over-row",
  name: "Bent-over Row",
  category: "Experimental",
  experimental: true,
  type: "reps",
  view: "side",
  setup: "Stand side-on to the camera with your full body in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    start: 150,
    target: 90,
    hysteresis: 10,
  },
  minRepDurationMs: 700,
  formRules: [
    {
      kind: "range",
      message: "Hinge forward more",
      metric: { kind: "incline", a: "hip", b: "shoulder" },
      max: 60,
    },
    { kind: "reachedTarget", message: "Pull your elbows further back" },
  ],
};

export const shrug: ExerciseDef = {
  id: "shrug",
  name: "Shrug",
  category: "Experimental",
  experimental: true,
  type: "reps",
  view: "front",
  setup: "Face the camera with your head and shoulders clearly visible.",
  side: "both",
  primary: {
    // Ear-to-shoulder gap relative to shoulder width.
    metric: {
      kind: "ratio",
      num: ["ear", "shoulder"],
      den: ["left_shoulder", "right_shoulder"],
    },
    start: 0.45,
    target: 0.35,
    hysteresis: 0.03,
  },
  minRepDurationMs: 600,
  formRules: [
    { kind: "reachedTarget", message: "Shrug your shoulders higher" },
  ],
};
