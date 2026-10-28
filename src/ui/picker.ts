import type { ExerciseDef, RepExerciseDef } from "../engine/types";
import type { PoseModel } from "../pose/detector";
import { clearCalibration, loadCalibration } from "../storage/calibration";
import { loadPrefs, savePrefs, type WorkoutPrefs } from "../storage/sessions";
import { loadSettings, POSE_MODELS } from "../storage/settings";

function numberField(
  form: HTMLElement,
  label: string,
  value: number,
  min: number,
  max: number,
): HTMLInputElement {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  wrap.append(text, input);
  form.appendChild(wrap);
  return input;
}

function readNumber(input: HTMLInputElement, fallback: number): number {
  const n = Math.round(Number(input.value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Number(input.max), Math.max(Number(input.min), n));
}

function button(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = className;
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
}

function checkbox(
  form: HTMLElement,
  label: string,
  checked: boolean,
): HTMLInputElement {
  const wrap = document.createElement("label");
  wrap.className = "field field-check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(input, text);
  form.appendChild(wrap);
  return input;
}

const fmtThreshold = (v: number) =>
  Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2);

export interface PickerHandlers {
  onStart: (exercise: ExerciseDef, prefs: WorkoutPrefs) => void;
  onCalibrate: (exercise: ExerciseDef) => void;
  onHistory: () => void;
  onAutoDetect: () => void;
  onCustom: () => void;
  onModelChange: (model: PoseModel) => void;
}

export class Picker {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLDivElement;
  private readonly grids: HTMLDivElement;
  private readonly config: HTMLDivElement;

  constructor(
    container: HTMLElement,
    exercises: ExerciseDef[],
    private readonly handlers: PickerHandlers,
  ) {
    this.root = document.createElement("div");
    this.root.className = "panel picker";

    this.list = document.createElement("div");
    this.config = document.createElement("div");
    this.config.hidden = true;
    this.root.append(this.list, this.config);

    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("h2");
    title.textContent = "Choose an exercise";

    const actions = document.createElement("div");
    actions.className = "panel-actions";
    const model = document.createElement("select");
    model.title = "Pose model — Lite is fastest on low-end devices";
    for (const m of POSE_MODELS) model.add(new Option(`Model: ${m}`, m));
    model.value = loadSettings().model;
    model.onchange = () => handlers.onModelChange(model.value as PoseModel);
    actions.append(
      model,
      button("Auto-detect", "btn", handlers.onAutoDetect),
      button("Custom", "btn", handlers.onCustom),
      button("History", "btn", handlers.onHistory),
    );
    header.append(title, actions);

    this.grids = document.createElement("div");
    this.list.append(header, this.grids);
    this.setExercises(exercises);

    container.appendChild(this.root);
  }

  setExercises(exercises: ExerciseDef[]): void {
    this.grids.replaceChildren();
    const byCategory = new Map<string, ExerciseDef[]>();
    for (const ex of exercises) {
      byCategory.set(ex.category, [...(byCategory.get(ex.category) ?? []), ex]);
    }

    for (const [category, list] of byCategory) {
      const heading = document.createElement("h3");
      heading.textContent = category;
      const grid = document.createElement("div");
      grid.className = "picker-grid";
      this.grids.append(heading, grid);

      for (const ex of list) {
        const card = document.createElement("button");
        card.className = "picker-card";

        const name = document.createElement("strong");
        name.textContent = ex.name;
        const view = document.createElement("span");
        view.className = "picker-view";
        view.textContent = `${ex.view} view · ${ex.type === "hold" ? "timed hold" : "reps"}`;
        const setup = document.createElement("p");
        setup.textContent = ex.setup;

        card.append(name, view, setup);
        card.onclick = () => this.openConfig(ex);
        grid.appendChild(card);
      }
    }
  }

  show(): void {
    this.list.hidden = false;
    this.config.hidden = true;
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** Shows the set-up form for an exercise, optionally with a status message. */
  openConfig(ex: ExerciseDef, message?: string): void {
    const prefs = loadPrefs();
    this.config.replaceChildren();

    const title = document.createElement("h2");
    title.textContent = ex.name;
    const setup = document.createElement("p");
    setup.className = "muted";
    setup.textContent = ex.setup;
    this.config.append(title, setup);

    if (message) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = message;
      this.config.appendChild(note);
    }

    const form = document.createElement("div");
    form.className = "config-form";
    const sets = numberField(form, "Sets", prefs.sets, 1, 10);
    const target =
      ex.type === "hold"
        ? numberField(form, "Hold (seconds)", prefs.targetHoldSec, 5, 600)
        : numberField(form, "Reps per set", prefs.targetReps, 1, 100);
    const rest = numberField(form, "Rest (seconds)", prefs.restSec, 0, 600);
    const voice = checkbox(form, "Voice callouts", prefs.voice);
    const record = checkbox(
      form,
      "Record pose data (trains auto-detect)",
      prefs.record,
    );
    this.config.appendChild(form);

    if (ex.type === "reps") this.config.appendChild(this.calibrationRow(ex));

    const actions = document.createElement("div");
    actions.className = "panel-actions";
    actions.append(
      button("Back", "btn", () => this.show()),
      button("Start", "btn btn-primary", () => {
        const next: WorkoutPrefs = {
          sets: readNumber(sets, prefs.sets),
          targetReps:
            ex.type === "reps"
              ? readNumber(target, prefs.targetReps)
              : prefs.targetReps,
          targetHoldSec:
            ex.type === "hold"
              ? readNumber(target, prefs.targetHoldSec)
              : prefs.targetHoldSec,
          restSec: readNumber(rest, prefs.restSec),
          voice: voice.checked,
          record: record.checked,
        };
        savePrefs(next);
        this.hide();
        this.handlers.onStart(ex, next);
      }),
    );
    this.config.appendChild(actions);

    this.list.hidden = true;
    this.config.hidden = false;
    this.root.hidden = false;
  }

  private calibrationRow(ex: RepExerciseDef): HTMLElement {
    const row = document.createElement("div");
    row.className = "calibration-row";
    const text = document.createElement("span");
    const cal = loadCalibration(ex.id);
    const { start, target } = cal ?? ex.primary;
    text.textContent = cal
      ? `Calibrated ${new Date(cal.calibratedAt).toLocaleDateString()}: ${fmtThreshold(start)} → ${fmtThreshold(target)}`
      : `Default thresholds: ${fmtThreshold(start)} → ${fmtThreshold(target)}`;
    row.append(
      text,
      button(cal ? "Recalibrate" : "Calibrate", "btn", () => {
        this.hide();
        this.handlers.onCalibrate(ex);
      }),
    );
    if (cal) {
      row.appendChild(
        button("Use defaults", "btn", () => {
          clearCalibration(ex.id);
          this.openConfig(ex, "Calibration cleared.");
        }),
      );
    }
    return row;
  }
}
