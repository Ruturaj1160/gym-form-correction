import type { ExerciseDef } from "../engine/types";

export const gluteBridge: ExerciseDef = {
  id: "glute-bridge",
  name: "Glute Bridge",
  category: "Lower body",
  type: "reps",
  view: "side",
  setup: "Lie on your back, knees bent, side-on to a floor-level camera.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    start: 140,
    target: 165,
    hysteresis: 5,
  },
  minRepDurationMs: 800,
  formRules: [{ kind: "reachedTarget", message: "Drive your hips higher" }],
};

export const calfRaise: ExerciseDef = {
  id: "calf-raise",
  name: "Calf Raise",
  category: "Lower body",
  type: "reps",
  view: "side",
  setup:
    "Stand side-on to the camera. Make sure your feet are clearly visible.",
  side: "auto",
  primary: {
    // Heel height above the toes, relative to shin length.
    metric: {
      kind: "verticalDelta",
      a: "heel",
      b: "foot_index",
      per: ["knee", "ankle"],
    },
    start: 0.03,
    target: 0.15,
    hysteresis: 0.02,
  },
  minRepDurationMs: 600,
  formRules: [{ kind: "reachedTarget", message: "Rise higher onto your toes" }],
};
