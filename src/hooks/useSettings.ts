import { Store, useStore } from "../app/store";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
} from "../storage/settings";

export const settingsStore = new Store<AppSettings>(loadSettings());

export function updateSettings(patch: Partial<AppSettings>): void {
  settingsStore.update(patch);
  saveSettings(settingsStore.get());
}

export function useSettings(): AppSettings {
  return useStore(settingsStore);
}
