import type { PoseModel } from "../pose/detector";
import { readJson, writeJson } from "./localStore";

export interface AppSettings {
  model: PoseModel;
}

const KEY = "gym-rep-counter:settings:v1";
export const POSE_MODELS: PoseModel[] = ["lite", "full", "heavy"];

/** Lite on low-core devices; full otherwise. */
export function defaultModel(): PoseModel {
  return (navigator.hardwareConcurrency ?? 8) <= 4 ? "lite" : "full";
}

export function loadSettings(): AppSettings {
  const data = readJson(KEY) as Partial<AppSettings> | null;
  const model = data?.model;
  return {
    model: model && POSE_MODELS.includes(model) ? model : defaultModel(),
  };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(KEY, settings);
}
