import { useStore } from "../app/store";
import { useEngine } from "../camera/CameraProvider";
import type { WorkoutView } from "../camera/engine";

export function useWorkout(): WorkoutView | null {
  return useStore(useEngine().workout);
}
