import { useMemo } from "react";
import { Store, useStore } from "../app/store";
import type { ExerciseDef } from "../engine/types";
import { EXERCISES } from "../exercises";
import { loadCustomExercises } from "../storage/customExercises";

export const customStore = new Store<ExerciseDef[]>(loadCustomExercises());

/** Call after any change to custom exercises in storage. */
export function refreshCustomExercises(): void {
  customStore.set(loadCustomExercises());
}

export function useCustomExercises(): ExerciseDef[] {
  return useStore(customStore);
}

export function useAllExercises(): ExerciseDef[] {
  const custom = useCustomExercises();
  return useMemo(() => [...EXERCISES, ...custom], [custom]);
}
