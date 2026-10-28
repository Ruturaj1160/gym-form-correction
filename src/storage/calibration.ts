import type { Calibration } from "../engine/calibration";
import { readJson, writeJson } from "./localStore";

const KEY = "gym-rep-counter:calibration:v1";

function loadAll(): Record<string, Calibration> {
  const data = readJson(KEY);
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, Calibration>)
    : {};
}

function isCalibration(v: unknown): v is Calibration {
  const c = v as Calibration;
  return (
    !!c &&
    [c.start, c.target, c.hysteresis, c.calibratedAt].every(Number.isFinite)
  );
}

export function loadCalibration(exerciseId: string): Calibration | null {
  const all = loadAll();
  const c = Object.hasOwn(all, exerciseId) ? all[exerciseId] : null;
  return isCalibration(c) ? c : null;
}

export function saveCalibration(exerciseId: string, c: Calibration): void {
  writeJson(KEY, { ...loadAll(), [exerciseId]: c });
}

export function clearCalibration(exerciseId: string): void {
  const all = loadAll();
  delete all[exerciseId];
  writeJson(KEY, all);
}
