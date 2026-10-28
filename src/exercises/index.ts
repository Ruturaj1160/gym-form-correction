import type { ExerciseDef } from "../engine/types";
import { loadCustomExercises } from "../storage/customExercises";
import { alternatingCurl, bicepCurl } from "./bicepCurl";
import { highKnees, jumpingJack, mountainClimber } from "./cardio";
import { crunch, legRaise, sitUp } from "./core";
import { deadlift, romanianDeadlift } from "./deadlift";
import { benchPress, bentOverRow, shrug } from "./experimental";
import { deadHang, plank, sidePlank, wallSit } from "./holds";
import { calfRaise, gluteBridge } from "./lowerBodyMisc";
import { alternatingLunge, lunge } from "./lunge";
import { pushup } from "./pushup";
import { squat } from "./squat";
import {
  dip,
  frontRaise,
  lateralRaise,
  pullUp,
  shoulderPress,
  tricepExtension,
} from "./upperBody";

export const EXERCISES: ExerciseDef[] = [
  // Lower body
  squat,
  lunge,
  alternatingLunge,
  deadlift,
  romanianDeadlift,
  gluteBridge,
  calfRaise,
  // Upper body
  pushup,
  bicepCurl,
  alternatingCurl,
  shoulderPress,
  lateralRaise,
  frontRaise,
  tricepExtension,
  pullUp,
  dip,
  // Core
  sitUp,
  crunch,
  legRaise,
  // Cardio
  jumpingJack,
  highKnees,
  mountainClimber,
  // Holds
  plank,
  sidePlank,
  wallSit,
  deadHang,
  // Experimental
  benchPress,
  bentOverRow,
  shrug,
];

/** Built-in plus user-defined exercises. */
export function allExercises(): ExerciseDef[] {
  return [...EXERCISES, ...loadCustomExercises()];
}

export function getExercise(id: string): ExerciseDef | undefined {
  return allExercises().find((e) => e.id === id);
}
