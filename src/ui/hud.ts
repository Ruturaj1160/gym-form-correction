import { metricUnit } from "../engine/metrics";
import type {
  HoldTrackerState,
  RepTrackerState,
  TrackerState,
} from "../engine/tracker";
import type { ExerciseDef, RepPhase } from "../engine/types";
import { fmtClock } from "./workoutScreens";

// Generic labels: "eccentric" is lowering for squats but pulling for pull-ups.
const PHASE_LABEL: Record<RepPhase, string> = {
  idle: "Get into start position",
  top: "Ready",
  eccentric: "Moving",
  bottom: "Target reached",
  concentric: "Returning",
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent.appendChild(node);
  return node;
}

const REP_MESSAGE_MS = 1500;

const fmtSec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly nameEl: HTMLSpanElement;
  private readonly setInfoEl: HTMLSpanElement;
  private readonly feedbackEl: HTMLDivElement;
  private readonly repsEl: HTMLSpanElement;
  private readonly repsLabelEl: HTMLElement;
  private readonly valueEl: HTMLSpanElement;
  private readonly phaseEl: HTMLSpanElement;
  private readonly sideEl: HTMLSpanElement;
  private readonly statsEl: HTMLDivElement;
  private readonly barEl: HTMLDivElement;
  private unit = "";
  private repMessage: { text: string; good: boolean; until: number } | null =
    null;
  private lastRepStats = "";

  constructor(
    container: HTMLElement,
    onRestartSet: () => void,
    onFinishSet: () => void,
    onEndWorkout: () => void,
  ) {
    this.root = el("div", "hud", container);
    this.root.hidden = true;

    const top = el("div", "hud-top", this.root);
    const titles = el("div", "hud-titles", top);
    this.nameEl = el("span", "hud-name", titles);
    this.setInfoEl = el("span", "hud-set-info", titles);
    const actions = el("div", "hud-actions", top);
    const buttons: [string, () => void][] = [
      ["Restart set", onRestartSet],
      ["Finish set", onFinishSet],
      ["End workout", onEndWorkout],
    ];
    for (const [label, handler] of buttons) {
      const btn = el("button", "", actions);
      btn.textContent = label;
      btn.onclick = handler;
    }

    this.feedbackEl = el("div", "hud-feedback", this.root);

    const reps = el("div", "hud-reps", this.root);
    this.repsEl = el("span", "hud-reps-count", reps);
    this.repsLabelEl = el("small", "", reps);

    const meta = el("div", "hud-meta", this.root);
    this.valueEl = el("span", "", meta);
    this.phaseEl = el("span", "", meta);
    this.sideEl = el("span", "", meta);

    this.statsEl = el("div", "hud-stats", this.root);

    this.barEl = el("div", "hud-bar-fill", el("div", "hud-bar", this.root));
  }

  show(exercise: ExerciseDef): void {
    this.nameEl.textContent = exercise.experimental
      ? `${exercise.name} (experimental)`
      : exercise.name;
    this.unit =
      exercise.type === "reps" ? metricUnit(exercise.primary.metric) : "";
    this.repsLabelEl.textContent = exercise.type === "reps" ? "reps" : "";
    this.reset();
    this.root.hidden = false;
  }

  reset(): void {
    this.repMessage = null;
    this.lastRepStats = "";
    this.feedbackEl.textContent = "";
    this.statsEl.textContent = "";
  }

  hide(): void {
    this.root.hidden = true;
  }

  setSetInfo(text: string): void {
    this.setInfoEl.textContent = text;
  }

  render(state: TrackerState): void {
    if (state.kind === "hold") this.renderHold(state);
    else this.renderReps(state);
  }

  private renderHold(state: HoldTrackerState): void {
    this.repsEl.textContent = fmtClock(state.elapsedMs);
    this.valueEl.textContent = "";
    this.phaseEl.textContent = state.holding ? "Holding" : "Paused";
    this.phaseEl.dataset.phase = state.holding ? "bottom" : "idle";
    this.sideEl.textContent = state.sides.join(" + ");
    this.barEl.style.width = state.holding ? "100%" : "0%";

    const issue = state.issues[0];
    this.setFeedback(
      !state.inFrame
        ? { text: "Get your whole body in frame", tone: "warn" }
        : issue
          ? { text: issue.message, tone: "bad" }
          : { text: "", tone: "" },
    );
    this.statsEl.textContent = "";
  }

  private renderReps(state: RepTrackerState): void {
    this.repsEl.textContent = String(state.reps);
    this.valueEl.textContent =
      state.value === null
        ? "--"
        : this.unit
          ? `${state.value.toFixed(0)}${this.unit}`
          : state.value.toFixed(2);
    this.phaseEl.textContent = PHASE_LABEL[state.phase];
    this.phaseEl.dataset.phase = state.phase;
    this.sideEl.textContent = state.sideCounts
      ? `L ${state.sideCounts.left} · R ${state.sideCounts.right}`
      : state.sides.join(" + ");
    this.barEl.style.width = `${(state.progress * 100).toFixed(0)}%`;

    const now = performance.now();
    if (state.rep) {
      const { event, score, feedback } = state.rep;
      this.repMessage = {
        text: feedback,
        good: event.kind === "full" && score >= 90,
        until: now + REP_MESSAGE_MS,
      };
      if (event.kind === "full") {
        this.lastRepStats = `Last rep: ${score}% · out ${fmtSec(event.eccentricMs)} · back ${fmtSec(event.concentricMs)}`;
        this.flashRep();
      }
    }
    if (this.repMessage && now > this.repMessage.until) this.repMessage = null;

    const issue = state.issues[0];
    this.setFeedback(
      issue
        ? { text: issue.message, tone: "bad" }
        : this.repMessage
          ? {
              text: this.repMessage.text,
              tone: this.repMessage.good ? "good" : "warn",
            }
          : { text: "", tone: "" },
    );

    const parts = [this.lastRepStats];
    if (state.avgScore !== null) parts.push(`Avg form: ${state.avgScore}%`);
    if (state.partials) parts.push(`Partial reps: ${state.partials}`);
    this.statsEl.textContent = parts.filter(Boolean).join("   ");
  }

  private setFeedback(msg: { text: string; tone: string }): void {
    this.feedbackEl.textContent = msg.text;
    this.feedbackEl.dataset.tone = msg.tone;
  }

  private flashRep(): void {
    this.repsEl.classList.remove("flash");
    void this.repsEl.offsetWidth; // restart CSS animation
    this.repsEl.classList.add("flash");
  }
}
