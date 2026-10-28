import type { ExerciseDef } from "../engine/types";

export const plank: ExerciseDef = {
  id: "plank",
  name: "Plank",
  category: "Holds",
  type: "hold",
  view: "side",
  setup:
    "Get into a plank side-on to a floor-level camera, full body in frame.",
  side: "auto",
  conditions: [
    {
      message: "Get into a plank position",
      metric: { kind: "incline", a: "shoulder", b: "ankle" },
      max: 35,
    },
    {
      message: "Keep your body in a straight line",
      metric: { kind: "angle", points: ["shoulder", "hip", "ankle"] },
      min: 160,
    },
  ],
};

export const sidePlank: ExerciseDef = {
  id: "side-plank",
  name: "Side Plank",
  category: "Holds",
  type: "hold",
  view: "front",
  setup: "Face the camera in a side plank with your full body in frame.",
  side: "auto",
  conditions: [
    {
      message: "Get into a side plank",
      metric: { kind: "incline", a: "shoulder", b: "ankle" },
      max: 45,
    },
    {
      message: "Lift your hips",
      metric: { kind: "angle", points: ["shoulder", "hip", "ankle"] },
      min: 160,
    },
  ],
};

export const wallSit: ExerciseDef = {
  id: "wall-sit",
  name: "Wall Sit",
  category: "Holds",
  type: "hold",
  view: "side",
  setup: "Sit against a wall side-on to the camera, full body in frame.",
  side: "auto",
  conditions: [
    {
      message: "Thighs parallel to the floor",
      metric: { kind: "angle", points: ["hip", "knee", "ankle"] },
      min: 70,
      max: 115,
    },
    {
      message: "Keep your back against the wall",
      metric: { kind: "incline", a: "hip", b: "shoulder" },
      min: 65,
    },
  ],
};

export const deadHang: ExerciseDef = {
  id: "dead-hang",
  name: "Dead Hang",
  category: "Holds",
  type: "hold",
  view: "front",
  setup: "Hang from a bar facing the camera with hands and hips in frame.",
  side: "both",
  conditions: [
    {
      message: "Grab the bar overhead",
      metric: {
        kind: "verticalDelta",
        a: "wrist",
        b: "nose",
        per: ["shoulder", "hip"],
      },
      min: 0.3,
    },
    {
      message: "Straighten your arms",
      metric: { kind: "angle", points: ["shoulder", "elbow", "wrist"] },
      min: 150,
    },
  ],
};
