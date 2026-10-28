import type { ExerciseDef } from "../engine/types";

export const squat: ExerciseDef = {
  id: "squat",
  name: "Squat",
  category: "Lower body",
  type: "reps",
  view: "side",
  setup:
    "Stand side-on to the camera with your full body (head to feet) in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["hip", "knee", "ankle"] },
    start: 160,
    target: 90,
    hysteresis: 10,
  },
  minRepDurationMs: 800,
  formRules: [
    {
      kind: "range",
      message: "Keep your chest up",
      metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
      min: 45,
      phases: ["eccentric", "bottom", "concentric"],
    },
    { kind: "reachedTarget", message: "Go deeper — thighs parallel" },
  ],
};
