import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { applyCalibration } from "./engine/calibration";
import type { TrackerState } from "./engine/tracker";
import type { ExerciseDef } from "./engine/types";
import { allExercises } from "./exercises";
import { createPoseDetector, type PoseModel } from "./pose/detector";
import { LandmarkSmoother } from "./pose/smoothing";
import { loadCalibration } from "./storage/calibration";
import { saveSession, type WorkoutPrefs } from "./storage/sessions";
import { loadSettings, saveSettings } from "./storage/settings";
import { addSamples } from "./storage/training";
import { Banner } from "./ui/banner";
import { CustomExercisesPanel } from "./ui/customEditor";
import { HistoryScreen } from "./ui/history";
import { Hud } from "./ui/hud";
import { Overlay } from "./ui/overlay";
import { Picker } from "./ui/picker";
import { Voice } from "./ui/voice";
import {
  fmtClock,
  RestScreen,
  SummaryScreen,
  type RecordingInfo,
} from "./ui/workoutScreens";
import { AutoDetectSession } from "./workout/autoDetectSession";
import { CalibrationSession } from "./workout/calibrationSession";
import { Recorder } from "./workout/recorder";
import { Workout, type WorkoutPhase } from "./workout/workout";

const video = document.querySelector<HTMLVideoElement>("#video")!;
const canvas = document.querySelector<HTMLCanvasElement>("#overlay")!;
const ui = document.querySelector<HTMLDivElement>("#ui")!;
const statusEl = document.querySelector<HTMLSpanElement>("#status")!;
const fpsEl = document.querySelector<HTMLSpanElement>("#fps")!;

const setStatus = (msg: string) => (statusEl.textContent = msg);

const LOW_FPS = 12;
const LOW_FPS_HINT_AFTER_MS = 5000;

const voice = new Voice();
const smoother = new LandmarkSmoother();
let detector: PoseLandmarker | null = null;
let currentModel: PoseModel = loadSettings().model;
let workout: Workout | null = null;
let recorder: Recorder | null = null;
let calibration: CalibrationSession | null = null;
let autoDetect: AutoDetectSession | null = null;
let lastRestSecondSpoken = 0;
let lastHoldTens = 0;

const setLabel = (w: Workout) => {
  const target =
    w.exercise.type === "hold"
      ? `${fmtClock(w.config.targetHoldSec * 1000, 0)} hold`
      : `${w.config.targetReps} reps`;
  return `Set ${w.setIndex + 1} of ${w.config.sets} · target ${target}`;
};

const hud = new Hud(
  ui,
  () => {
    workout?.restartSet(performance.now());
    hud.reset();
    lastHoldTens = 0;
  },
  () => workout?.finishSet(performance.now()),
  () => workout?.end(performance.now()),
);

const rest = new RestScreen(
  ui,
  () => workout?.skipRest(performance.now()),
  () => workout?.end(performance.now()),
);

const summary = new SummaryScreen(
  ui,
  () => {
    summary.hide();
    picker.show();
  },
  () => {
    summary.hide();
    history.show();
  },
);

const history = new HistoryScreen(ui, () => {
  history.hide();
  picker.show();
});

const banner = new Banner(ui);

const custom = new CustomExercisesPanel(
  ui,
  () => picker.setExercises(allExercises()),
  () => {
    custom.hide();
    picker.show();
  },
);

const picker = new Picker(ui, allExercises(), {
  onStart: startWorkout,
  onCalibrate: (exercise) => {
    if (exercise.type !== "reps") return;
    voice.say(
      `Calibrating ${exercise.name}. Do two or three slow, full reps.`,
      {
        interrupt: true,
      },
    );
    calibration = new CalibrationSession(
      exercise,
      banner,
      performance.now(),
      (message) => {
        calibration = null;
        picker.openConfig(exercise, message);
      },
    );
  },
  onHistory: () => {
    picker.hide();
    history.show();
  },
  onAutoDetect: () => {
    picker.hide();
    const close = () => {
      autoDetect = null;
      banner.hide();
      picker.show();
    };
    autoDetect = new AutoDetectSession(
      banner,
      allExercises(),
      (exercise) => {
        autoDetect = null;
        banner.hide();
        picker.openConfig(
          exercise,
          "Detected automatically — confirm your sets and start.",
        );
      },
      close,
    );
  },
  onCustom: () => {
    picker.hide();
    custom.show();
  },
  onModelChange: (model) => {
    saveSettings({ model });
    void loadDetector(model);
  },
});

function startWorkout(exercise: ExerciseDef, prefs: WorkoutPrefs): void {
  voice.enabled = prefs.voice;
  const tuned = applyCalibration(exercise, loadCalibration(exercise.id));
  workout = new Workout(tuned, prefs, performance.now(), onPhaseChange);
  recorder = prefs.record ? new Recorder(exercise.id, exercise.name) : null;
  lastHoldTens = 0;
  hud.show(tuned);
  hud.setSetInfo(setLabel(workout));
  voice.say(`${exercise.name}. Set 1 of ${prefs.sets}. Go`, {
    interrupt: true,
  });
}

function onPhaseChange(phase: WorkoutPhase): void {
  const w = workout;
  if (!w) return;

  if (phase === "rest") {
    hud.hide();
    recorder?.breakWindow();
    lastRestSecondSpoken = 0;
    rest.show(`Next: set ${w.setIndex + 2} of ${w.config.sets}`);
    voice.say(`Set complete. Rest ${w.config.restSec} seconds`, {
      interrupt: true,
    });
  } else if (phase === "active") {
    rest.hide();
    lastHoldTens = 0;
    hud.show(w.exercise);
    hud.setSetInfo(setLabel(w));
    voice.say(`Set ${w.setIndex + 1}. Go`, { interrupt: true });
  } else {
    hud.hide();
    rest.hide();
    const session = w.toSession();
    if (session) saveSession(session);

    let recording: RecordingInfo | undefined;
    const rec = recorder;
    if (rec && rec.frameCount) {
      addSamples(rec.samples);
      recording = {
        frames: rec.frameCount,
        samples: rec.samples.length,
        download: () => rec.download(),
      };
    }
    summary.show(session, recording);
    voice.say("Workout complete", { interrupt: true });
    workout = null;
    recorder = null;
  }
}

function speakFeedback(state: TrackerState, stillActive: boolean): void {
  if (state.issues[0]) {
    voice.say(state.issues[0].message, { throttleMs: 4000 });
  }
  if (state.kind === "hold") {
    const tens = Math.floor(state.elapsedMs / 10_000);
    if (tens > lastHoldTens && stillActive) {
      voice.say(`${tens * 10} seconds`);
    }
    lastHoldTens = Math.max(lastHoldTens, tens);
    return;
  }
  // When a set just finished, the phase-change announcement takes priority.
  if (!state.rep || !stillActive) return;
  if (state.rep.event.kind === "full") {
    voice.say(String(state.reps), { interrupt: true });
  } else {
    voice.say(state.rep.feedback, { throttleMs: 3000 });
  }
}

async function startCamera(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
}

async function loadDetector(model: PoseModel): Promise<void> {
  setStatus(`Loading ${model} pose model…`);
  try {
    const next = await createPoseDetector(model);
    detector?.close();
    detector = next;
    currentModel = model;
    smoother.reset();
    setStatus("Step into frame");
  } catch (err) {
    console.error(err);
    setStatus(`Couldn't load ${model} model — keeping ${currentModel}.`);
  }
}

async function main(): Promise<void> {
  setStatus("Starting camera…");
  await startCamera();
  await loadDetector(currentModel);
  if (!detector) throw new Error("Pose model failed to load");

  const overlay = new Overlay(canvas);
  overlay.resize(video.videoWidth, video.videoHeight);
  const aspect = video.videoWidth / video.videoHeight;

  let lastVideoTime = -1;
  let lastFrame = performance.now();
  let fps = 0;
  let lowFpsSince: number | null = null;

  const loop = () => {
    const now = performance.now();

    calibration?.tick(now);
    if (workout) {
      workout.tick(now);
      if (workout?.phase === "rest") {
        const remaining = workout.restEndsAt - now;
        rest.render(remaining);
        const sec = Math.ceil(remaining / 1000);
        if (sec >= 1 && sec <= 3 && sec !== lastRestSecondSpoken) {
          lastRestSecondSpoken = sec;
          voice.say(String(sec), { interrupt: true });
        }
      }
    }

    if (detector && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = detector.detectForVideo(video, now);
      overlay.clear();

      const pose = result.landmarks[0];
      if (pose) {
        const smoothed = smoother.smooth(pose, now);
        overlay.drawSkeleton(smoothed);
        calibration?.update(smoothed, aspect);
        autoDetect?.update(smoothed, aspect, now);

        const wasActive = workout?.phase === "active";
        const state = workout?.update(smoothed, aspect, now);
        if (wasActive) recorder?.add(smoothed, aspect, now);
        if (state) {
          state.trackedPoints.forEach((pts) => overlay.drawHighlight(pts));
          state.issues.forEach((i) =>
            overlay.drawHighlight(i.points, "#ef4444"),
          );
          hud.render(state);
          speakFeedback(state, workout?.phase === "active");
        }
        setStatus("Tracking");
      } else {
        smoother.reset();
        setStatus("No person detected");
      }

      const dt = now - lastFrame;
      lastFrame = now;
      fps = fps ? fps * 0.9 + (1000 / dt) * 0.1 : 1000 / dt;
      lowFpsSince =
        fps < LOW_FPS && currentModel !== "lite" ? (lowFpsSince ?? now) : null;
      fpsEl.textContent =
        lowFpsSince !== null && now - lowFpsSince > LOW_FPS_HINT_AFTER_MS
          ? `${fps.toFixed(0)} FPS — slow device? Try Model: lite`
          : `${fps.toFixed(0)} FPS`;
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

main().catch((err) => {
  console.error(err);
  setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
});
