import type { ExerciseDef } from "../engine/types";

export const pushup: ExerciseDef = {
  id: "pushup",
  name: "Push-up",
  category: "Upper body",
  type: "reps",
  view: "side",
  setup:
    "Place the camera at floor level, side-on, with your whole body in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    start: 155,
    target: 90,
    hysteresis: 10,
  },
  minRepDurationMs: 600,
  formRules: [
    {
      kind: "range",
      message: "Keep your body straight",
      metric: { kind: "angle", points: ["shoulder", "hip", "ankle"] },
      min: 160,
    },
    { kind: "reachedTarget", message: "Go lower — chest to the floor" },
  ],
};
