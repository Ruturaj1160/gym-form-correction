import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Store } from "../app/store";
import { applyCalibration } from "../engine/calibration";
import type { RepSummary, TrackerState } from "../engine/tracker";
import type { ExerciseDef, RepExerciseDef } from "../engine/types";
import { createPoseDetector, type PoseModel } from "../pose/detector";
import { LandmarkSmoother } from "../pose/smoothing";
import { loadCalibration } from "../storage/calibration";
import {
  saveSession,
  type SessionRecord,
  type SetResult,
  type WorkoutPrefs,
} from "../storage/sessions";
import { addSamples } from "../storage/training";
import { BRAND } from "../app/brand";
import {
  AutoDetectSession,
  type AutoDetectView,
} from "../workout/autoDetectSession";
import {
  CalibrationSession,
  type CalibrationOutcome,
  type CalibrationView,
} from "../workout/calibrationSession";
import { Recorder } from "../workout/recorder";
import { Voice } from "../workout/voice";
import { Workout, type WorkoutPhase } from "../workout/workout";
import { Overlay } from "./overlay";

const LOW_FPS = 12;
const LOW_FPS_AFTER_MS = 5000;
// HUD publish rate (~15 Hz); rep events and phase changes publish immediately.
const PUBLISH_INTERVAL_MS = 66;
const FPS_PUBLISH_INTERVAL_MS = 1000;

export type CameraStatus =
  | "starting"
  | "denied"
  | "error"
  | "loading-model"
  | "ready";

export interface CameraState {
  status: CameraStatus;
  error: string | null;
  model: PoseModel;
  switchingModel: boolean;
  fps: number;
  personDetected: boolean;
  lowFps: boolean;
}

export type EngineMode = "idle" | "workout" | "calibration" | "autodetect";

export interface WorkoutView {
  exercise: ExerciseDef;
  config: WorkoutPrefs;
  phase: WorkoutPhase;
  setIndex: number;
  state: TrackerState | null;
  /** Most recent rep event (full or partial) and when it happened. */
  lastRep: { summary: RepSummary; at: number } | null;
  lastFullRep: RepSummary | null;
  restRemainingMs: number;
  restTotalMs: number;
  lastSet: SetResult | null;
  now: number;
}

export interface RecordingInfo {
  frames: number;
  samples: number;
  download: () => void;
}

export interface WorkoutSummary {
  session: SessionRecord | null;
  recording: RecordingInfo | null;
}

/**
 * Owns the camera, pose detector, frame loop and active session.
 * Runs entirely outside React and publishes snapshots through stores.
 */
export class AppEngine {
  readonly video: HTMLVideoElement;
  readonly canvas: HTMLCanvasElement;

  readonly camera: Store<CameraState>;
  readonly mode = new Store<EngineMode>("idle");
  readonly workout = new Store<WorkoutView | null>(null);
  readonly calibration = new Store<CalibrationView | null>(null);
  readonly autoDetect = new Store<AutoDetectView | null>(null);

  private readonly voice = new Voice();
  private readonly smoother = new LandmarkSmoother();
  private readonly overlay: Overlay;
  private detector: PoseLandmarker | null = null;
  private aspect = 16 / 9;
  private startPromise: Promise<void> | null = null;
  private loopStarted = false;

  private session: Workout | null = null;
  private recorder: Recorder | null = null;
  private calib: CalibrationSession | null = null;
  private auto: AutoDetectSession | null = null;
  private onWorkoutDone: ((summary: WorkoutSummary) => void) | null = null;

  private trackerState: TrackerState | null = null;
  private lastRep: WorkoutView["lastRep"] = null;
  private lastFullRep: RepSummary | null = null;
  private restTotalMs = 0;
  private lastPublish = 0;
  private lastCalibPublish = 0;
  private lastRestSecondSpoken = 0;
  private lastHoldTens = 0;

  private lastVideoTime = -1;
  private lastFrame = 0;
  private fps = 0;
  private lastFpsPublish = 0;
  private lowFpsSince: number | null = null;

  constructor(initialModel: PoseModel) {
    this.camera = new Store<CameraState>({
      status: "starting",
      error: null,
      model: initialModel,
      switchingModel: false,
      fps: 0,
      personDetected: false,
      lowFps: false,
    });
    this.video = document.createElement("video");
    this.video.playsInline = true;
    this.video.muted = true;
    this.canvas = document.createElement("canvas");
    this.overlay = new Overlay(this.canvas);
  }

  /** Idempotent; call retry() after a failure. */
  start(): Promise<void> {
    this.startPromise ??= this.doStart();
    return this.startPromise;
  }

  retry(): Promise<void> {
    this.startPromise = null;
    return this.start();
  }

  private async doStart(): Promise<void> {
    this.camera.update({ status: "starting", error: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      this.video.srcObject = stream;
      await this.video.play();
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      this.camera.update({
        status: denied ? "denied" : "error",
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    this.overlay.resize(this.video.videoWidth, this.video.videoHeight);
    this.aspect = this.video.videoWidth / this.video.videoHeight;

    this.camera.update({ status: "loading-model" });
    if (!(await this.loadModel(this.camera.get().model))) {
      this.camera.update({
        status: "error",
        error:
          "Couldn't load the pose model. Check your connection and try again.",
      });
      return;
    }
    this.camera.update({ status: "ready" });

    if (!this.loopStarted) {
      this.loopStarted = true;
      requestAnimationFrame(this.loop);
    }
  }

  /** Switches pose model; keeps the current one if loading fails. */
  async setModel(model: PoseModel): Promise<boolean> {
    if (this.camera.get().status !== "ready") {
      this.camera.update({ model });
      return true;
    }
    this.camera.update({ switchingModel: true });
    const ok = await this.loadModel(model);
    this.camera.update({ switchingModel: false });
    return ok;
  }

  private async loadModel(model: PoseModel): Promise<boolean> {
    try {
      const next = await createPoseDetector(model);
      this.detector?.close();
      this.detector = next;
      this.smoother.reset();
      this.lowFpsSince = null;
      this.camera.update({ model, lowFps: false });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // ── Workout ─────────────────────────────────────────────

  startWorkout(
    exercise: ExerciseDef,
    prefs: WorkoutPrefs,
    onDone: (summary: WorkoutSummary) => void,
  ): void {
    this.voice.enabled = prefs.voice;
    const tuned = applyCalibration(exercise, loadCalibration(exercise.id));
    this.session = new Workout(tuned, prefs, performance.now(), (p) =>
      this.onPhaseChange(p),
    );
    this.recorder = prefs.record
      ? new Recorder(exercise.id, exercise.name)
      : null;
    this.onWorkoutDone = onDone;
    this.resetSetState();
    this.mode.set("workout");
    this.publishWorkout();
    this.voice.say(`${exercise.name}. Set 1 of ${prefs.sets}. Go`, {
      interrupt: true,
    });
  }

  restartSet(): void {
    this.session?.restartSet(performance.now());
    this.resetSetState();
    this.publishWorkout();
  }

  finishSet(): void {
    this.session?.finishSet(performance.now());
  }

  endWorkout(): void {
    this.session?.end(performance.now());
  }

  skipRest(): void {
    this.session?.skipRest(performance.now());
  }

  extendRest(ms: number): void {
    if (!this.session) return;
    this.session.extendRest(ms);
    this.restTotalMs += ms;
    this.publishWorkout();
  }

  private resetSetState(): void {
    this.trackerState = null;
    this.lastRep = null;
    this.lastFullRep = null;
    this.lastHoldTens = 0;
  }

  private onPhaseChange(phase: WorkoutPhase): void {
    const w = this.session;
    if (!w) return;

    if (phase === "rest") {
      this.recorder?.breakWindow();
      this.lastRestSecondSpoken = 0;
      this.restTotalMs = w.config.restSec * 1000;
      this.overlay.clear();
      this.voice.say(`Set complete. Rest ${w.config.restSec} seconds`, {
        interrupt: true,
      });
      this.publishWorkout();
    } else if (phase === "active") {
      this.resetSetState();
      this.voice.say(`Set ${w.setIndex + 1}. Go`, { interrupt: true });
      this.publishWorkout();
    } else {
      const session = w.toSession();
      if (session) saveSession(session);

      let recording: RecordingInfo | null = null;
      const rec = this.recorder;
      if (rec && rec.frameCount) {
        addSamples(rec.samples);
        recording = {
          frames: rec.frameCount,
          samples: rec.samples.length,
          download: () => rec.download(),
        };
      }
      this.voice.say("Workout complete", { interrupt: true });

      const done = this.onWorkoutDone;
      this.session = null;
      this.recorder = null;
      this.onWorkoutDone = null;
      this.toIdle();
      this.workout.set(null);
      done?.({ session, recording });
    }
  }

  private publishWorkout(): void {
    const w = this.session;
    if (!w) return;
    const now = performance.now();
    this.lastPublish = now;
    this.workout.set({
      exercise: w.exercise,
      config: w.config,
      phase: w.phase,
      setIndex: w.setIndex,
      state: this.trackerState,
      lastRep: this.lastRep,
      lastFullRep: this.lastFullRep,
      restRemainingMs: Math.max(0, w.restEndsAt - now),
      restTotalMs: this.restTotalMs,
      lastSet: w.results[w.results.length - 1] ?? null,
      now,
    });
  }

  private speakFeedback(state: TrackerState, stillActive: boolean): void {
    if (state.issues[0]) {
      this.voice.say(state.issues[0].message, { throttleMs: 4000 });
    }
    if (state.kind === "hold") {
      const tens = Math.floor(state.elapsedMs / 10_000);
      if (tens > this.lastHoldTens && stillActive)
        this.voice.say(`${tens * 10} seconds`);
      this.lastHoldTens = Math.max(this.lastHoldTens, tens);
      return;
    }
    // When a set just finished, the phase-change announcement takes priority.
    if (!state.rep || !stillActive) return;
    if (state.rep.event.kind === "full") {
      this.voice.say(String(state.reps), { interrupt: true });
    } else {
      this.voice.say(state.rep.feedback, { throttleMs: 3000 });
    }
  }

  // ── Calibration ─────────────────────────────────────────

  startCalibration(
    exercise: RepExerciseDef,
    voiceEnabled: boolean,
    onDone: (message: string, outcome: CalibrationOutcome) => void,
  ): void {
    this.voice.enabled = voiceEnabled;
    this.voice.say(
      `Calibrating ${exercise.name}. Do two or three slow, full reps.`,
      {
        interrupt: true,
      },
    );
    const now = performance.now();
    this.calib = new CalibrationSession(exercise, now, (message, outcome) => {
      this.calib = null;
      this.calibration.set(null);
      this.toIdle();
      onDone(message, outcome);
    });
    this.mode.set("calibration");
    this.calibration.set(this.calib.view(now));
  }

  completeCalibration(): void {
    this.calib?.complete();
  }

  cancelCalibration(): void {
    this.calib?.cancel();
  }

  // ── Auto-detect ─────────────────────────────────────────

  startAutoDetect(exercises: ExerciseDef[]): void {
    this.auto = new AutoDetectSession(exercises);
    this.mode.set("autodetect");
    this.autoDetect.set(this.auto.view);
  }

  stopAutoDetect(): void {
    this.auto = null;
    this.autoDetect.set(null);
    this.toIdle();
  }

  private toIdle(): void {
    this.overlay.clear();
    this.lastFrame = 0;
    this.lowFpsSince = null;
    this.mode.set("idle");
  }

  // ── Frame loop ──────────────────────────────────────────

  private readonly loop = (): void => {
    const now = performance.now();

    if (this.session) {
      this.session.tick(now);
      if (this.session?.phase === "rest") this.tickRest(now);
    }

    if (this.calib) {
      this.calib.tick(now);
      if (this.calib && now - this.lastCalibPublish >= PUBLISH_INTERVAL_MS) {
        this.lastCalibPublish = now;
        this.calibration.set(this.calib.view(now));
      }
    }

    // Skip pose detection while browsing to save CPU and battery.
    if (
      this.mode.get() !== "idle" &&
      this.detector &&
      this.video.currentTime !== this.lastVideoTime
    ) {
      this.processFrame(this.detector, now);
    }

    requestAnimationFrame(this.loop);
  };

  private tickRest(now: number): void {
    const w = this.session;
    if (!w) return;
    const sec = Math.ceil((w.restEndsAt - now) / 1000);
    if (sec >= 1 && sec <= 3 && sec !== this.lastRestSecondSpoken) {
      this.lastRestSecondSpoken = sec;
      this.voice.say(String(sec), { interrupt: true });
    }
    if (now - this.lastPublish >= PUBLISH_INTERVAL_MS) this.publishWorkout();
  }

  private processFrame(detector: PoseLandmarker, now: number): void {
    this.lastVideoTime = this.video.currentTime;
    const result = detector.detectForVideo(this.video, now);
    this.overlay.clear();

    const pose = result.landmarks[0];
    if (pose) {
      const smoothed = this.smoother.smooth(pose, now);
      this.overlay.drawSkeleton(smoothed);
      this.calib?.update(smoothed, this.aspect);
      if (this.auto?.update(smoothed, this.aspect, now)) {
        this.autoDetect.set(this.auto.view);
      }
      this.updateWorkout(smoothed, now);
    } else {
      this.smoother.reset();
    }
    if (this.camera.get().personDetected !== !!pose) {
      this.camera.update({ personDetected: !!pose });
    }
    this.updateFps(now);
  }

  private updateWorkout(
    landmarks: Parameters<Workout["update"]>[0],
    now: number,
  ): void {
    const wasActive = this.session?.phase === "active";
    const state = this.session?.update(landmarks, this.aspect, now) ?? null;
    if (wasActive) this.recorder?.add(landmarks, this.aspect, now);
    if (!state) return;

    state.trackedPoints.forEach((pts) => this.overlay.drawHighlight(pts));
    state.issues.forEach((i) =>
      this.overlay.drawHighlight(i.points, BRAND.error),
    );

    // The set may have just ended inside update(); only keep live state for an active set.
    const stillActive = this.session?.phase === "active";
    this.speakFeedback(state, stillActive);
    if (!stillActive) return;

    this.trackerState = state;
    let force = false;
    if (state.kind === "reps" && state.rep) {
      this.lastRep = { summary: state.rep, at: now };
      if (state.rep.event.kind === "full") this.lastFullRep = state.rep;
      force = true;
    }
    if (force || now - this.lastPublish >= PUBLISH_INTERVAL_MS)
      this.publishWorkout();
  }

  private updateFps(now: number): void {
    if (this.lastFrame) {
      const dt = now - this.lastFrame;
      this.fps = this.fps ? this.fps * 0.9 + (1000 / dt) * 0.1 : 1000 / dt;
    }
    this.lastFrame = now;

    const model = this.camera.get().model;
    this.lowFpsSince =
      this.fps < LOW_FPS && model !== "lite" ? (this.lowFpsSince ?? now) : null;
    const lowFps =
      this.lowFpsSince !== null && now - this.lowFpsSince > LOW_FPS_AFTER_MS;

    if (
      lowFps !== this.camera.get().lowFps ||
      now - this.lastFpsPublish >= FPS_PUBLISH_INTERVAL_MS
    ) {
      this.lastFpsPublish = now;
      this.camera.update({ fps: Math.round(this.fps), lowFps });
    }
  }
}
