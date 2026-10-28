import type { ExerciseDef } from "../engine/types";
import { validateExercise } from "../engine/validate";
import { readJson, writeJson } from "./localStore";

const KEY = "gym-rep-counter:custom-exercises:v1";
export const CUSTOM_PREFIX = "custom-";

export function loadCustomExercises(): ExerciseDef[] {
  const data = readJson(KEY);
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    const r = validateExercise(raw);
    return r.ok ? [r.value] : [];
  });
}

/** Inserts or replaces by id. */
export function saveCustomExercise(def: ExerciseDef): void {
  const others = loadCustomExercises().filter((e) => e.id !== def.id);
  writeJson(KEY, [...others, def]);
}

export function deleteCustomExercise(id: string): void {
  writeJson(
    KEY,
    loadCustomExercises().filter((e) => e.id !== id),
  );
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${CUSTOM_PREFIX}${slug || "exercise"}`;
}

/** Keeps imported/edited ids in the custom namespace so built-ins can't be overwritten. */
export function toCustomId(id: string): string {
  return id.startsWith(CUSTOM_PREFIX) ? id : `${CUSTOM_PREFIX}${id}`;
}

export function uniqueId(base: string, taken: Set<string>): string {
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
