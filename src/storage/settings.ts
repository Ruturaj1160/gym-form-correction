import type { PoseModel } from "../pose/detector";
import { readJson, writeJson } from "./localStore";

export type ThemeMode = "dark" | "light" | "system";

export interface AppSettings {
  model: PoseModel;
  themeMode: ThemeMode;
}

const KEY = "gym-rep-counter:settings:v1";
export const POSE_MODELS: PoseModel[] = ["lite", "full", "heavy"];
const THEME_MODES: ThemeMode[] = ["dark", "light", "system"];

/** Lite on low-core devices; full otherwise. */
export function defaultModel(): PoseModel {
  return (navigator.hardwareConcurrency ?? 8) <= 4 ? "lite" : "full";
}

export function loadSettings(): AppSettings {
  const data = readJson(KEY) as Partial<AppSettings> | null;
  const model = data?.model;
  const themeMode = data?.themeMode;
  return {
    model: model && POSE_MODELS.includes(model) ? model : defaultModel(),
    themeMode: themeMode && THEME_MODES.includes(themeMode) ? themeMode : "dark",
  };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(KEY, settings);
}
