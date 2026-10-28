import type { ExerciseDef, RepExerciseDef } from "../engine/types";

export const bicepCurl: RepExerciseDef = {
  id: "bicep-curl",
  name: "Bicep Curl",
  category: "Upper body",
  type: "reps",
  view: "front",
  setup:
    "Face the camera with both arms and hips in frame. Curl both arms together.",
  side: "both",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    start: 150,
    target: 50,
    hysteresis: 10,
  },
  minRepDurationMs: 600,
  formRules: [
    {
      kind: "range",
      message: "Keep elbows by your sides",
      metric: { kind: "angle", points: ["hip", "shoulder", "elbow"] },
      max: 30,
    },
    { kind: "reachedTarget", message: "Curl all the way up" },
  ],
};

export const alternatingCurl: ExerciseDef = {
  ...bicepCurl,
  id: "alternating-curl",
  name: "Alternating Curl",
  setup: "Face the camera with both arms and hips in frame. Alternate arms.",
  side: "each",
};
