import type { ExerciseDef, RepExerciseDef } from "../engine/types";

export const lunge: RepExerciseDef = {
  id: "lunge",
  name: "Lunge",
  category: "Lower body",
  type: "reps",
  view: "side",
  setup: "Stand side-on to the camera with your full body in frame.",
  side: "both",
  primary: {
    metric: { kind: "angle", points: ["hip", "knee", "ankle"] },
    start: 160,
    target: 100,
    hysteresis: 10,
  },
  minRepDurationMs: 800,
  formRules: [
    {
      kind: "range",
      message: "Keep your torso upright",
      metric: { kind: "incline", a: "hip", b: "shoulder" },
      min: 65,
    },
    { kind: "reachedTarget", message: "Go lower — back knee toward the floor" },
  ],
};

export const alternatingLunge: ExerciseDef = {
  ...lunge,
  id: "alternating-lunge",
  name: "Alternating Lunge",
  setup: "Stand side-on to the camera. Alternate legs each rep.",
  sideAttribution: { joint: "knee", pick: "higher" },
};
