import type { TrainingSample } from "../engine/recognizer";
import { readJson, writeJson } from "./localStore";

const KEY = "gym-rep-counter:training:v1";
const MAX_SAMPLES = 3000;

function isSample(v: unknown): v is TrainingSample {
  const s = v as TrainingSample;
  return (
    !!s &&
    typeof s.label === "string" &&
    Array.isArray(s.f) &&
    s.f.every((x) => typeof x === "number" && Number.isFinite(x))
  );
}

export function loadSamples(): TrainingSample[] {
  const data = readJson(KEY);
  if (!Array.isArray(data)) return [];
  const samples = data.filter(isSample);
  // Drop samples from an older feature layout.
  const dims = samples[samples.length - 1]?.f.length;
  return samples.filter((s) => s.f.length === dims);
}

/** Appends samples, keeping the most recent MAX_SAMPLES. */
export function addSamples(samples: TrainingSample[]): void {
  const rounded = samples.map((s) => ({
    label: s.label,
    f: s.f.map((v) => Math.round(v * 1000) / 1000),
  }));
  writeJson(KEY, [...loadSamples(), ...rounded].slice(-MAX_SAMPLES));
}

export function clearSamples(): void {
  localStorage.removeItem(KEY);
}

export function sampleCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of loadSamples())
    counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
  return counts;
}
