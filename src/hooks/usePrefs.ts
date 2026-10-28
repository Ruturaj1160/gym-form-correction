import { Store, useStore } from "../app/store";
import { loadPrefs, savePrefs, type WorkoutPrefs } from "../storage/sessions";

export const prefsStore = new Store<WorkoutPrefs>(loadPrefs());

export function updatePrefs(patch: Partial<WorkoutPrefs>): void {
  prefsStore.update(patch);
  savePrefs(prefsStore.get());
}

export function usePrefs(): WorkoutPrefs {
  return useStore(prefsStore);
}
