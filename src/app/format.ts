export const fmtClock = (ms: number, decimals = 1): string => {
  const s = Math.max(0, ms) / 1000;
  const secs = (s % 60)
    .toFixed(decimals)
    .padStart(decimals ? 3 + decimals : 2, "0");
  return `${Math.floor(s / 60)}:${secs}`;
};

export const fmtSec = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/** Angles as integers, small ratios with two decimals. */
export const fmtValue = (v: number): string =>
  Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2);

export const fmtDateTime = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtShortDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function formColor(score: number | null): "success" | "warning" | "error" | "default" {
  if (score === null) return "default";
  if (score >= 90) return "success";
  if (score >= 70) return "warning";
  return "error";
}
