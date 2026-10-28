import {
  CATEGORIES,
  JOINTS,
  SIDE_MODES,
  type ExerciseDef,
  type Joint,
} from "../engine/types";
import { validateExercise } from "../engine/validate";
import { EXERCISES } from "../exercises";
import {
  CUSTOM_PREFIX,
  deleteCustomExercise,
  loadCustomExercises,
  saveCustomExercise,
  slugify,
} from "../storage/customExercises";
import { downloadJson } from "../storage/localStore";

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

function btn(
  parent: HTMLElement,
  label: string,
  onClick: () => void,
  primary = false,
): void {
  el("button", primary ? "btn btn-primary" : "btn", parent, label).onclick =
    onClick;
}

function field(form: HTMLElement, label: string): HTMLLabelElement {
  const wrap = el("label", "field", form);
  el("span", "", wrap, label);
  return wrap;
}

function select(
  form: HTMLElement,
  label: string,
  options: readonly string[],
  value: string,
) {
  const s = el("select", "", field(form, label));
  for (const o of options) s.add(new Option(o, o));
  s.value = value;
  return s;
}

function input(form: HTMLElement, label: string, value: string, type = "text") {
  const i = el("input", "", field(form, label));
  i.type = type;
  i.value = value;
  if (type === "number") i.step = "any";
  return i;
}

/** Ensures imported/edited ids live in the custom namespace and don't collide with built-ins. */
function customId(id: string): string {
  return id.startsWith(CUSTOM_PREFIX) ? id : `${CUSTOM_PREFIX}${id}`;
}

function uniqueId(base: string, ignoreId?: string): string {
  const taken = new Set(
    [...EXERCISES, ...loadCustomExercises()]
      .map((e) => e.id)
      .filter((id) => id !== ignoreId),
  );
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

export class CustomExercisesPanel {
  private readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly status: HTMLParagraphElement;
  private readonly fileInput: HTMLInputElement;

  constructor(
    container: HTMLElement,
    private readonly onChanged: () => void,
    private readonly onClose: () => void,
  ) {
    this.root = el("div", "panel custom", container);
    this.root.hidden = true;
    this.status = document.createElement("p");
    this.status.className = "note";
    this.body = document.createElement("div");

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = "application/json,.json";
    this.fileInput.hidden = true;
    this.fileInput.onchange = () => void this.importFile();

    this.root.append(this.fileInput, this.status, this.body);
  }

  show(): void {
    this.setStatus("");
    this.renderList();
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  private setStatus(text: string): void {
    this.status.textContent = text;
    this.status.hidden = !text;
  }

  private renderList(): void {
    this.body.replaceChildren();
    const header = el("div", "panel-header", this.body);
    el("h2", "", header, "Custom exercises");
    const actions = el("div", "panel-actions", header);
    btn(actions, "New", () => this.renderForm());
    btn(actions, "Import", () => this.fileInput.click());
    btn(actions, "Export all", () => this.export(loadCustomExercises()));
    btn(actions, "Close", this.onClose, true);

    const list = loadCustomExercises();
    if (!list.length) {
      el(
        "p",
        "muted",
        this.body,
        "No custom exercises yet. Create one or import a JSON file.",
      );
      return;
    }
    const table = el("table", "data-table", this.body);
    const tbody = el("tbody", "", table);
    for (const ex of list) {
      const row = el("tr", "", tbody);
      el("td", "", row, ex.name);
      el("td", "muted", row, `${ex.type} · ${ex.category} · ${ex.view} view`);
      const cell = el("td", "row-actions", row);
      btn(cell, "Edit JSON", () => this.renderJsonEditor(ex));
      btn(cell, "Export", () => this.export([ex]));
      btn(cell, "Delete", () => {
        if (!confirm(`Delete "${ex.name}"?`)) return;
        deleteCustomExercise(ex.id);
        this.onChanged();
        this.renderList();
      });
    }
  }

  private renderForm(): void {
    this.setStatus("");
    this.body.replaceChildren();
    el("h2", "", this.body, "New exercise");
    el(
      "p",
      "muted",
      this.body,
      "Pick three joints; the angle is measured at the middle one. Use 'Edit JSON' afterwards for advanced metrics and form rules.",
    );

    const form = el("div", "config-form", this.body);
    const name = input(form, "Name", "");
    const type = select(form, "Type", ["reps", "hold"], "reps");
    const category = select(form, "Category", CATEGORIES, "Custom");
    const view = select(form, "Camera view", ["side", "front"], "side");
    const side = select(form, "Sides", SIDE_MODES, "auto");
    const a = select(form, "Joint A", JOINTS, "hip");
    const b = select(form, "Joint B (vertex)", JOINTS, "knee");
    const c = select(form, "Joint C", JOINTS, "ankle");

    const repsForm = el("div", "config-form", this.body);
    const start = input(repsForm, "Start angle (rest)", "160", "number");
    const target = input(repsForm, "Target angle", "90", "number");
    const hysteresis = input(repsForm, "Hysteresis", "10", "number");
    const minRep = input(repsForm, "Min rep time (ms)", "600", "number");
    const targetMsg = input(
      repsForm,
      "Partial-rep message",
      "Full range of motion",
    );

    const holdForm = el("div", "config-form", this.body);
    const min = input(holdForm, "Min angle", "160", "number");
    const max = input(holdForm, "Max angle", "180", "number");
    const holdMsg = input(
      holdForm,
      "Message when out of range",
      "Hold the position",
    );

    const setupWrap = el("label", "field field-wide", this.body);
    el("span", "", setupWrap, "Camera setup hint");
    const setup = el("input", "", setupWrap);
    setup.value = "Full body in frame.";

    const syncType = () => {
      repsForm.hidden = type.value !== "reps";
      holdForm.hidden = type.value !== "hold";
    };
    type.onchange = syncType;
    syncType();

    const actions = el("div", "panel-actions", this.body);
    btn(actions, "Cancel", () => this.show());
    btn(
      actions,
      "Save",
      () => {
        const points = [a.value, b.value, c.value] as [Joint, Joint, Joint];
        const metric = { kind: "angle", points };
        const base = {
          id: uniqueId(slugify(name.value)),
          name: name.value,
          category: category.value,
          view: view.value,
          setup: setup.value,
          side: side.value,
        };
        const raw =
          type.value === "hold"
            ? {
                ...base,
                type: "hold",
                conditions: [
                  {
                    message: holdMsg.value,
                    metric,
                    min: Number(min.value),
                    max: Number(max.value),
                  },
                ],
              }
            : {
                ...base,
                type: "reps",
                primary: {
                  metric,
                  start: Number(start.value),
                  target: Number(target.value),
                  hysteresis: Number(hysteresis.value),
                },
                minRepDurationMs: Number(minRep.value),
                formRules: targetMsg.value.trim()
                  ? [{ kind: "reachedTarget", message: targetMsg.value }]
                  : [],
              };
        this.saveValidated(raw);
      },
      true,
    );
  }

  private renderJsonEditor(ex: ExerciseDef): void {
    this.setStatus("");
    this.body.replaceChildren();
    el("h2", "", this.body, `Edit ${ex.name}`);
    const area = el("textarea", "json-editor", this.body);
    area.value = JSON.stringify(ex, null, 2);
    area.spellcheck = false;

    const actions = el("div", "panel-actions", this.body);
    btn(actions, "Cancel", () => this.show());
    btn(
      actions,
      "Save",
      () => {
        let raw: unknown;
        try {
          raw = JSON.parse(area.value);
        } catch {
          this.setStatus("Invalid JSON.");
          return;
        }
        if (raw && typeof raw === "object") {
          // Keep the original id so calibration and history stay linked.
          (raw as { id: unknown }).id = ex.id;
        }
        this.saveValidated(raw);
      },
      true,
    );
  }

  private saveValidated(raw: unknown): void {
    const result = validateExercise(raw);
    if (!result.ok) {
      this.setStatus(`Not saved — ${result.error}`);
      return;
    }
    saveCustomExercise(result.value);
    this.onChanged();
    this.show();
    this.setStatus(`Saved "${result.value.name}".`);
  }

  private export(list: ExerciseDef[]): void {
    if (!list.length) {
      this.setStatus("Nothing to export.");
      return;
    }
    downloadJson(
      list.length === 1 ? `${list[0].id}.json` : "custom-exercises.json",
      { format: "gym-rep-counter/exercises", version: 1, exercises: list },
    );
  }

  private async importFile(): Promise<void> {
    const file = this.fileInput.files?.[0];
    this.fileInput.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      this.setStatus("File too large (max 1 MB).");
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      this.setStatus("Invalid JSON file.");
      return;
    }

    const items: unknown[] = Array.isArray(data)
      ? data
      : data &&
          typeof data === "object" &&
          Array.isArray((data as { exercises?: unknown }).exercises)
        ? (data as { exercises: unknown[] }).exercises
        : [data];

    let imported = 0;
    const errors: string[] = [];
    for (const item of items.slice(0, 200)) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { id?: unknown }).id === "string"
      ) {
        const obj = item as { id: string };
        obj.id = customId(obj.id);
      }
      const r = validateExercise(item);
      if (r.ok) {
        saveCustomExercise(r.value);
        imported++;
      } else {
        errors.push(r.error);
      }
    }

    this.onChanged();
    this.renderList();
    this.setStatus(
      `Imported ${imported}.` +
        (errors.length
          ? ` Skipped ${errors.length}: ${errors.slice(0, 3).join("; ")}`
          : ""),
    );
  }
}
