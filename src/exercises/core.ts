import type { ExerciseDef } from "../engine/types";

export const sitUp: ExerciseDef = {
  id: "sit-up",
  name: "Sit-up",
  category: "Core",
  type: "reps",
  view: "side",
  setup: "Lie on your back, knees bent, side-on to a floor-level camera.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    start: 125,
    target: 70,
    hysteresis: 10,
  },
  minRepDurationMs: 800,
  formRules: [{ kind: "reachedTarget", message: "Sit all the way up" }],
};

export const crunch: ExerciseDef = {
  id: "crunch",
  name: "Crunch",
  category: "Core",
  type: "reps",
  view: "side",
  setup: "Lie on your back, knees bent, side-on to a floor-level camera.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    start: 130,
    target: 110,
    hysteresis: 5,
  },
  minRepDurationMs: 600,
  formRules: [{ kind: "reachedTarget", message: "Lift your shoulders higher" }],
};

export const legRaise: ExerciseDef = {
  id: "leg-raise",
  name: "Leg Raise",
  category: "Core",
  type: "reps",
  view: "side",
  setup: "Lie on your back, legs straight, side-on to a floor-level camera.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "hip", "knee"] },
    start: 160,
    target: 100,
    hysteresis: 10,
  },
  minRepDurationMs: 800,
  formRules: [
    {
      kind: "range",
      message: "Keep your legs straight",
      metric: { kind: "angle", points: ["hip", "knee", "ankle"] },
      min: 150,
    },
    { kind: "reachedTarget", message: "Raise your legs to vertical" },
  ],
};
