import { readJson } from "./localStore";

export interface SetResult {
  reps: number;
  partials: number;
  avgScore: number | null;
  /** Hold exercises only. */
  holdMs: number | null;
  durationMs: number;
}

export interface SessionRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: "reps" | "hold";
  startedAt: number;
  endedAt: number;
  sets: SetResult[];
}

export interface WorkoutPrefs {
  sets: number;
  targetReps: number;
  targetHoldSec: number;
  restSec: number;
  voice: boolean;
  /** Record pose data and add it to auto-detect training. */
  record: boolean;
}

const SESSIONS_KEY = "gym-rep-counter:sessions:v1";
const PREFS_KEY = "gym-rep-counter:prefs:v1";
const MAX_SESSIONS = 500;

export const DEFAULT_PREFS: WorkoutPrefs = {
  sets: 3,
  targetReps: 10,
  targetHoldSec: 30,
  restSec: 60,
  voice: true,
  record: false,
};

function isSession(v: unknown): v is SessionRecord {
  const s = v as SessionRecord;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.exerciseName === "string" &&
    typeof s.startedAt === "number" &&
    Array.isArray(s.sets)
  );
}

/** Newest first. */
export function listSessions(): SessionRecord[] {
  const data = readJson(SESSIONS_KEY);
  return Array.isArray(data)
    ? data.filter(isSession).sort((a, b) => b.startedAt - a.startedAt)
    : [];
}

export function saveSession(session: SessionRecord): void {
  const sessions = [session, ...listSessions()].slice(0, MAX_SESSIONS);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function clearSessions(): void {
  localStorage.removeItem(SESSIONS_KEY);
}

export function loadPrefs(): WorkoutPrefs {
  const data = readJson(PREFS_KEY);
  return data && typeof data === "object"
    ? { ...DEFAULT_PREFS, ...(data as Partial<WorkoutPrefs>) }
    : { ...DEFAULT_PREFS };
}

export function savePrefs(prefs: WorkoutPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
