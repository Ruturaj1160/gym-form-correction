import type { SessionRecord } from "../storage/sessions";

export const fmtClock = (ms: number, decimals = 1): string => {
  const s = Math.max(0, ms) / 1000;
  const secs = (s % 60)
    .toFixed(decimals)
    .padStart(decimals ? 3 + decimals : 2, "0");
  return `${Math.floor(s / 60)}:${secs}`;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent: HTMLElement,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  parent.appendChild(node);
  return node;
}

export class RestScreen {
  private readonly root: HTMLDivElement;
  private readonly countdownEl: HTMLDivElement;
  private readonly nextEl: HTMLParagraphElement;

  constructor(container: HTMLElement, onSkip: () => void, onEnd: () => void) {
    this.root = el("div", "panel rest", container);
    this.root.hidden = true;
    el("h2", "", this.root, "Rest");
    this.countdownEl = el("div", "rest-countdown", this.root);
    this.nextEl = el("p", "muted", this.root);

    const actions = el("div", "panel-actions", this.root);
    el("button", "btn", actions, "End workout").onclick = onEnd;
    el("button", "btn btn-primary", actions, "Skip rest").onclick = onSkip;
  }

  show(nextLabel: string): void {
    this.nextEl.textContent = nextLabel;
    this.root.hidden = false;
  }

  render(remainingMs: number): void {
    this.countdownEl.textContent = String(
      Math.ceil(Math.max(0, remainingMs) / 1000),
    );
  }

  hide(): void {
    this.root.hidden = true;
  }
}

export interface RecordingInfo {
  frames: number;
  samples: number;
  download: () => void;
}

export class SummaryScreen {
  private readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;

  constructor(
    container: HTMLElement,
    onDone: () => void,
    onHistory: () => void,
  ) {
    this.root = el("div", "panel summary", container);
    this.root.hidden = true;
    el("h2", "", this.root, "Workout complete");
    this.body = el("div", "", this.root);

    const actions = el("div", "panel-actions", this.root);
    el("button", "btn", actions, "History").onclick = onHistory;
    el("button", "btn btn-primary", actions, "Done").onclick = onDone;
  }

  show(session: SessionRecord | null, recording?: RecordingInfo): void {
    this.body.replaceChildren();
    if (!session) {
      el("p", "muted", this.body, "No completed sets — nothing saved.");
      this.renderRecording(recording);
      this.root.hidden = false;
      return;
    }

    el("h3", "", this.body, session.exerciseName);
    const table = el("table", "data-table", this.body);
    const head = el("tr", "", el("thead", "", table));
    const isHold = session.type === "hold";
    for (const h of isHold
      ? ["Set", "Hold", "Duration"]
      : ["Set", "Reps", "Partials", "Form", "Duration"]) {
      el("th", "", head, h);
    }
    const tbody = el("tbody", "", table);
    session.sets.forEach((s, i) => {
      const row = el("tr", "", tbody);
      el("td", "", row, String(i + 1));
      if (isHold) {
        el("td", "", row, fmtClock(s.holdMs ?? 0));
      } else {
        el("td", "", row, String(s.reps));
        el("td", "", row, String(s.partials));
        el("td", "", row, s.avgScore === null ? "--" : `${s.avgScore}%`);
      }
      el("td", "", row, fmtClock(s.durationMs, 0));
    });

    const total = isHold
      ? `Total hold: ${fmtClock(session.sets.reduce((n, s) => n + (s.holdMs ?? 0), 0))}`
      : `Total reps: ${session.sets.reduce((n, s) => n + s.reps, 0)}`;
    el("p", "summary-total", this.body, total);
    this.renderRecording(recording);
    this.root.hidden = false;
  }

  private renderRecording(recording?: RecordingInfo): void {
    if (!recording) return;
    const box = el("div", "calibration-row", this.body);
    el(
      "span",
      "",
      box,
      `Recorded ${recording.frames} frames · ${recording.samples} auto-detect training samples added`,
    );
    el("button", "btn", box, "Download recording").onclick = recording.download;
  }

  hide(): void {
    this.root.hidden = true;
  }
}
