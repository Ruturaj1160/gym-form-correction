import {
  clearSessions,
  listSessions,
  type SessionRecord,
} from "../storage/sessions";
import { fmtClock } from "./workoutScreens";

const CHART_SESSIONS = 20;
const ALL = "__all__";

function sessionTotal(s: SessionRecord): number {
  return s.type === "hold"
    ? s.sets.reduce((n, set) => n + (set.holdMs ?? 0), 0) / 1000
    : s.sets.reduce((n, set) => n + set.reps, 0);
}

function sessionForm(s: SessionRecord): number | null {
  const scores = s.sets
    .map((set) => set.avgScore)
    .filter((v): v is number => v !== null);
  return scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function drawChart(canvas: HTMLCanvasElement, sessions: SessionRecord[]): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const pad = { top: 28, right: 40, bottom: 28, left: 12 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  ctx.clearRect(0, 0, w, h);
  if (!sessions.length) return;

  const isHold = sessions[0].type === "hold";
  const totals = sessions.map(sessionTotal);
  const forms = sessions.map(sessionForm);
  const maxV = Math.max(...totals, 1);
  const slot = plotW / sessions.length;
  const barW = Math.min(40, slot * 0.6);
  const x = (i: number) => pad.left + slot * i + slot / 2;

  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";

  totals.forEach((v, i) => {
    const bh = (v / maxV) * plotH;
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x(i) - barW / 2, pad.top + plotH - bh, barW, bh);
    ctx.fillStyle = "#eee";
    ctx.fillText(
      isHold ? `${Math.round(v)}s` : String(v),
      x(i),
      pad.top + plotH - bh - 4,
    );
    const d = new Date(sessions[i].startedAt);
    ctx.fillStyle = "#888";
    ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, x(i), h - 8);
  });

  if (!isHold && forms.some((f) => f !== null)) {
    const y = (f: number) => pad.top + plotH - (f / 100) * plotH;
    ctx.strokeStyle = "#4ade80";
    ctx.fillStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    forms.forEach((f, i) => {
      if (f === null) return;
      if (started) ctx.lineTo(x(i), y(f));
      else ctx.moveTo(x(i), y(f));
      started = true;
    });
    ctx.stroke();
    forms.forEach((f, i) => {
      if (f === null) return;
      ctx.beginPath();
      ctx.arc(x(i), y(f), 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.textAlign = "left";
    ctx.fillText("100%", w - pad.right + 4, pad.top + 4);
    ctx.fillText("0%", w - pad.right + 4, pad.top + plotH);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#facc15";
  ctx.fillText(isHold ? "■ Hold time" : "■ Total reps", pad.left, 14);
  if (!isHold) {
    ctx.fillStyle = "#4ade80";
    ctx.fillText("● Avg form", pad.left + 100, 14);
  }
}

export class HistoryScreen {
  private readonly root: HTMLDivElement;
  private readonly select: HTMLSelectElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly list: HTMLDivElement;
  private sessions: SessionRecord[] = [];

  constructor(container: HTMLElement, onClose: () => void) {
    this.root = document.createElement("div");
    this.root.className = "panel history";
    this.root.hidden = true;

    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("h2");
    title.textContent = "History";
    const controls = document.createElement("div");
    controls.className = "panel-actions";
    this.select = document.createElement("select");
    this.select.onchange = () => this.render();
    const clearBtn = document.createElement("button");
    clearBtn.className = "btn";
    clearBtn.textContent = "Clear";
    clearBtn.onclick = () => {
      if (!confirm("Delete all workout history?")) return;
      clearSessions();
      this.show();
    };
    const closeBtn = document.createElement("button");
    closeBtn.className = "btn btn-primary";
    closeBtn.textContent = "Close";
    closeBtn.onclick = onClose;
    controls.append(this.select, clearBtn, closeBtn);
    header.append(title, controls);

    this.canvas = document.createElement("canvas");
    this.canvas.className = "history-chart";
    this.canvas.width = 800;
    this.canvas.height = 220;

    this.list = document.createElement("div");
    this.root.append(header, this.canvas, this.list);
    container.appendChild(this.root);
  }

  show(): void {
    this.sessions = listSessions();

    const exercises = new Map<string, string>();
    for (const s of this.sessions) exercises.set(s.exerciseId, s.exerciseName);
    const prev = this.select.value;
    this.select.replaceChildren(new Option("All exercises", ALL));
    for (const [id, name] of exercises) this.select.add(new Option(name, id));
    // Default to the most recently trained exercise so the chart is visible.
    this.select.value = exercises.has(prev)
      ? prev
      : (this.sessions[0]?.exerciseId ?? ALL);

    this.render();
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  private render(): void {
    const id = this.select.value;
    const filtered =
      id === ALL
        ? this.sessions
        : this.sessions.filter((s) => s.exerciseId === id);

    this.canvas.hidden = id === ALL || !filtered.length;
    if (!this.canvas.hidden) {
      drawChart(this.canvas, filtered.slice(0, CHART_SESSIONS).reverse());
    }

    this.list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No workouts yet.";
      this.list.appendChild(empty);
      return;
    }

    const table = document.createElement("table");
    table.className = "data-table";
    const head = table.createTHead().insertRow();
    for (const h of ["Date", "Exercise", "Sets", "Total", "Form"]) {
      const th = document.createElement("th");
      th.textContent = h;
      head.appendChild(th);
    }
    const body = table.createTBody();
    for (const s of filtered) {
      const row = body.insertRow();
      const isHold = s.type === "hold";
      const form = sessionForm(s);
      const cells = [
        fmtDate(s.startedAt),
        s.exerciseName,
        s.sets
          .map((set) => (isHold ? fmtClock(set.holdMs ?? 0, 0) : set.reps))
          .join(" / "),
        isHold ? fmtClock(sessionTotal(s) * 1000, 0) : String(sessionTotal(s)),
        form === null ? "--" : `${form}%`,
      ];
      for (const c of cells) row.insertCell().textContent = String(c);
    }
    this.list.appendChild(table);
  }
}
