import type { ExerciseDef } from "../engine/types";

export const deadlift: ExerciseDef = {
  id: "deadlift",
  name: "Deadlift",
  category: "Lower body",
  type: "reps",
  view: "side",
  setup:
    "Stand side-on to the camera with your full body and the bar in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    start: 165,
    target: 100,
    hysteresis: 10,
  },
  minRepDurationMs: 1000,
  formRules: [
    {
      kind: "range",
      message: "Hips too low — don't squat the lift",
      metric: { kind: "angle", points: ["hip", "knee", "ankle"] },
      min: 100,
      phases: ["bottom"],
    },
    { kind: "reachedTarget", message: "Lower the bar to mid-shin" },
  ],
};

export const romanianDeadlift: ExerciseDef = {
  id: "romanian-deadlift",
  name: "Romanian Deadlift",
  category: "Lower body",
  type: "reps",
  view: "side",
  setup: "Stand side-on to the camera with your full body in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    start: 165,
    target: 110,
    hysteresis: 10,
  },
  minRepDurationMs: 1000,
  formRules: [
    {
      kind: "range",
      message: "Keep a soft knee — hinge at the hips",
      metric: { kind: "angle", points: ["hip", "knee", "ankle"] },
      min: 145,
      phases: ["eccentric", "bottom", "concentric"],
    },
    {
      kind: "reachedTarget",
      message: "Hinge further — feel the hamstring stretch",
    },
  ],
};
