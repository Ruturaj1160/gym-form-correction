import type { ExerciseDef } from "../engine/types";

export const shoulderPress: ExerciseDef = {
  id: "shoulder-press",
  name: "Shoulder Press",
  category: "Upper body",
  type: "reps",
  view: "front",
  setup:
    "Face the camera with your arms and hips in frame. Start with hands at shoulder height.",
  side: "both",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    start: 95,
    target: 160,
    hysteresis: 10,
  },
  minRepDurationMs: 700,
  formRules: [
    {
      kind: "range",
      message: "Press straight up — wrists over elbows",
      metric: { kind: "incline", a: "elbow", b: "wrist" },
      min: 60,
    },
    { kind: "reachedTarget", message: "Lock out your arms overhead" },
  ],
};

export const lateralRaise: ExerciseDef = {
  id: "lateral-raise",
  name: "Lateral Raise",
  category: "Upper body",
  type: "reps",
  view: "front",
  setup: "Face the camera with both arms and hips in frame.",
  side: "both",
  primary: {
    metric: { kind: "angle", points: ["hip", "shoulder", "elbow"] },
    start: 25,
    target: 80,
    hysteresis: 8,
  },
  minRepDurationMs: 700,
  formRules: [
    {
      kind: "range",
      message: "Stop at shoulder height",
      metric: { kind: "angle", points: ["hip", "shoulder", "elbow"] },
      max: 110,
    },
    {
      kind: "range",
      message: "Keep your arms long",
      metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
      min: 130,
    },
    { kind: "reachedTarget", message: "Raise to shoulder height" },
  ],
};

export const frontRaise: ExerciseDef = {
  id: "front-raise",
  name: "Front Raise",
  category: "Upper body",
  type: "reps",
  view: "side",
  setup: "Stand side-on to the camera with your arm and hip in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["hip", "shoulder", "elbow"] },
    start: 25,
    target: 80,
    hysteresis: 8,
  },
  minRepDurationMs: 700,
  formRules: [
    {
      kind: "range",
      message: "Stop at shoulder height",
      metric: { kind: "angle", points: ["hip", "shoulder", "elbow"] },
      max: 110,
    },
    {
      kind: "range",
      message: "Keep your arms long",
      metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
      min: 130,
    },
    { kind: "reachedTarget", message: "Raise to shoulder height" },
  ],
};

export const tricepExtension: ExerciseDef = {
  id: "tricep-extension",
  name: "Overhead Tricep Extension",
  category: "Upper body",
  type: "reps",
  view: "side",
  setup: "Stand side-on to the camera with your arms overhead in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    start: 75,
    target: 155,
    hysteresis: 10,
  },
  minRepDurationMs: 700,
  formRules: [
    {
      kind: "range",
      message: "Keep your elbows pointing up",
      metric: { kind: "incline", a: "shoulder", b: "elbow" },
      min: 60,
    },
    { kind: "reachedTarget", message: "Fully straighten your arms" },
  ],
};

export const pullUp: ExerciseDef = {
  id: "pull-up",
  name: "Pull-up",
  category: "Upper body",
  type: "reps",
  view: "front",
  setup:
    "Face the camera (or face away) with the bar, hands and hips in frame.",
  side: "both",
  primary: {
    // Nose height relative to wrists, in torso lengths.
    metric: {
      kind: "verticalDelta",
      a: "nose",
      b: "wrist",
      per: ["shoulder", "hip"],
    },
    start: -0.6,
    target: 0,
    hysteresis: 0.1,
  },
  minRepDurationMs: 800,
  formRules: [{ kind: "reachedTarget", message: "Get your chin over the bar" }],
};

export const dip: ExerciseDef = {
  id: "dip",
  name: "Dip",
  category: "Upper body",
  type: "reps",
  view: "side",
  setup: "Set up side-on to the camera with your full upper body in frame.",
  side: "auto",
  primary: {
    metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
    start: 155,
    target: 95,
    hysteresis: 10,
  },
  minRepDurationMs: 700,
  formRules: [
    { kind: "reachedTarget", message: "Lower until upper arms are parallel" },
  ],
};
