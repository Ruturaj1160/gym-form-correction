# AI Gym Rep Counter — Plan

Browser app using `@mediapipe/tasks-vision` PoseLandmarker. One generic engine; each exercise is a data definition (joints, thresholds, form rules).

```
Webcam → PoseLandmarker (33 pts) → Smoothing → Metrics (angles/distances/ratios)
      → Rep state machine + Form checker → HUD (reps, sets, timer, feedback) → History
```

---

## Phase 1 — Foundation

- [x] Set up Vite + TypeScript (`index.html`, `src/main.ts`, `tsconfig.json`, npm scripts)
- [x] Webcam capture (`getUserMedia`), video + canvas overlay layout
- [x] `src/pose/detector.ts` — PoseLandmarker init (GPU delegate, VIDEO mode, `full` model)
- [x] `src/pose/landmarks.ts` — named landmark indices (LEFT_KNEE = 25, …)
- [x] `src/pose/smoothing.ts` — One Euro filter per landmark
- [x] Ignore landmarks with `visibility < 0.5`
- [x] `src/ui/overlay.ts` — draw skeleton on canvas
- [x] FPS counter

## Phase 2 — Engine + 3 reference exercises

- [x] `src/engine/metrics.ts` — `angle(a,b,c)`, `distance`, `ratio`, `verticalDelta`
- [x] `src/engine/types.ts` — `ExerciseDef`, `Metric`, `FormRule` types
- [x] `src/engine/repCounter.ts` — generic state machine (IDLE → TOP → ECCENTRIC → BOTTOM → TOP = rep)
  - [x] Hysteresis
  - [x] Minimum rep duration (anti-jitter)
- [x] `src/engine/sideSelector.ts` — auto-pick more visible side / average for symmetric moves
- [x] `src/exercises/index.ts` — exercise registry
- [x] Exercise: Squat (side view)
- [x] Exercise: Bicep curl (front view)
- [x] Exercise: Push-up (side view)
- [x] `src/ui/hud.ts` — rep count, live angle, phase indicator
- [x] `src/ui/picker.ts` — exercise selection screen + camera positioning hint

## Phase 3 — Form feedback

- [x] `src/engine/formChecker.ts` — evaluate `formRules`
- [x] On-screen feedback messages
- [x] Highlight offending joints in red
- [x] Partial-rep detection ("Go deeper")
- [x] Tempo (eccentric / concentric seconds)
- [x] Per-rep form score

## Phase 4 — Exercise library expansion

### Rep-based (angle)

- [x] Lunge
- [x] Shoulder press
- [x] Lateral raise
- [x] Front raise
- [x] Tricep extension
- [x] Deadlift
- [x] Romanian deadlift
- [x] Glute bridge
- [x] Sit-up
- [x] Crunch
- [x] Leg raise
- [x] Dip

### Rep-based (distance / position)

- [x] Jumping jack
- [x] High knees
- [x] Calf raise
- [x] Pull-up
- [x] Mountain climber

### Holds

- [x] `src/engine/holdTimer.ts` — timer while pose within bounds
- [x] Plank
- [x] Side plank
- [x] Wall sit
- [x] Dead hang

### Alternating / bilateral

- [x] Per-side counting (left / right)
- [x] Alternating curls
- [x] Alternating lunges

### Experimental (limited reliability — occlusion / lying down)

- [x] Bench press
- [x] Bent-over row
- [x] Shrugs

## Phase 5 — Workout flow

- [x] Sets + target reps
- [x] Rest timer between sets
- [x] `src/ui/voice.ts` — speechSynthesis rep callouts
- [x] `src/storage/sessions.ts` — save workouts (IndexedDB / localStorage)
- [x] History screen + charts (reps per session, form score)

## Phase 6 — Advanced (optional)

- [x] Per-user calibration (1–2 slow reps set personal thresholds)
- [x] Record landmark sequences for training data
- [x] Auto exercise recognition (TF.js / k-NN on angle features)
- [x] Custom exercise editor + import/export definitions
- [x] Low-end device mode (`lite` model)

### Phase 6 — Implementation notes

**Low-end device mode**

- Model selector (lite / full / heavy) in the picker header, saved in settings.
- Defaults to `lite` when `navigator.hardwareConcurrency <= 4`, otherwise `full`.
- Switching hot-swaps the detector without restarting the camera.
- If FPS stays below 12 for 5 s on full/heavy, the FPS label suggests switching to lite.

**Per-user calibration**

- "Calibrate" on the config screen for any rep exercise: 15 s (or press Done) of 2–3 slow, full reps.
- Uses the 5th–95th percentile of the primary metric (robust to outliers).
- Thresholds are set 15% inside the observed range so they're reliably reached.
- Rejects calibration if the movement covers less than 40% of the default range.
- Saved per exercise; applied automatically at workout start. "Use defaults" clears it.

**Pose recording**

- "Record pose data" option on the config screen; records only during active sets (not rest).
- Capped at ~10 min (18,000 frames).
- Summary screen offers "Download recording" (JSON: 33 × [x, y, z, visibility] per frame).

**Auto exercise recognition**

- k-NN (k = 7, distance-weighted, z-normalized features) instead of TF.js — no extra dependency.
- Features: 2 s sliding window of mirror-invariant angles (elbow, shoulder, hip, knee as L/R average + asymmetry), wrist height, torso incline, feet spread → mean / std / min / max.
- Trained from your own recordings: each recorded workout adds labelled samples (max 3,000 stored).
- Only predicts while moving, with ≥ 60% confidence and 3 consistent predictions in a row, then offers "Start <exercise>".
- No "unknown" class — it picks the closest trained exercise. Needs recordings of each exercise you want detected.

**Custom exercise editor + import/export**

- "Custom" in the picker: list, create, edit, export, import, delete.
- "New" form: 3-joint angle metric with rep thresholds or hold range.
- "Edit JSON" for full control (other metric kinds, form rules, side attribution).
- All saves and imports go through `src/engine/validate.ts` (whitelists known fields, checks types/ranges).
- Imports limited to 1 MB / 200 exercises; ids get a `custom-` prefix so built-ins can't be overwritten. Re-importing the same id updates it.

**New files**

- `src/engine/` — `calibration.ts`, `features.ts`, `recognizer.ts`, `validate.ts`
- `src/storage/` — `localStore.ts`, `settings.ts`, `calibration.ts`, `training.ts`, `customExercises.ts`
- `src/workout/` — `recorder.ts`, `calibrationSession.ts`, `autoDetectSession.ts`
- `src/ui/` — `banner.ts`, `customEditor.ts`

**Not yet verified:** built and type-checked only; needs testing with a real camera.

---

## Reference: primary metrics

| Exercise       | Metric                         | Up / Down (approx.) |
| -------------- | ------------------------------ | ------------------- |
| Squat          | hip–knee–ankle angle           | 160° / 90°          |
| Push-up        | shoulder–elbow–wrist angle     | 160° / 90°          |
| Bicep curl     | shoulder–elbow–wrist angle     | 160° / 40°          |
| Shoulder press | elbow angle + wrist above head | 90° / 165°          |
| Lateral raise  | hip–shoulder–elbow angle       | 20° / 85°           |
| Lunge          | front hip–knee–ankle angle     | 160° / 95°          |
| Deadlift       | shoulder–hip–knee angle        | 170° / 100°         |
| Glute bridge   | shoulder–hip–knee angle        | 130° / 170°         |
| Sit-up         | shoulder–hip–knee angle        | 130° / 60°          |
| Jumping jack   | wrist spread ÷ shoulder width  | < 1.2 / > 2.5       |
| Pull-up        | nose y vs wrist y              | below / above       |
| Plank (hold)   | shoulder–hip–ankle angle       | hold 165°–185°      |

## Notes

- Use angles/ratios, never raw pixels (body-size independent).
- Each exercise declares a recommended camera `view` (side / front).
- Webcam requires HTTPS or `localhost`.
- All processing on-device; no video leaves the browser.
