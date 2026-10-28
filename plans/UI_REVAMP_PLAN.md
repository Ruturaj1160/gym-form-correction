# UI Revamp Plan — Material UI

Replace the hand-rolled DOM/CSS UI with a consistent **Material Design** interface built on **MUI (Material UI)**. The engine (`src/engine`, `src/pose`, `src/storage`, `src/workout`) stays as-is; only the presentation layer (`src/ui`, `src/style.css`, `index.html`, `src/main.ts` wiring) is rebuilt.

---

## 1. Why — current UI problems

| Area | Problem |
| --- | --- |
| Visual consistency | Ad-hoc dark CSS, mixed button styles, hard-coded colours, no spacing scale or type scale |
| Layout | Everything is an absolute overlay on a 16:9 video box; panels cover the camera; cramped on mobile |
| Navigation | No app shell — screens are toggled with `hidden`; no clear way to move between Library / History / Custom / Settings |
| Workout HUD | Text-heavy, small progress bar, feedback banner competes with rep count |
| Forms | Raw `<input>` fields, no inline validation, no helper text |
| Feedback | `confirm()` dialogs, status text in footer, no snackbars or loading states |
| Data views | Plain tables, hand-drawn canvas chart without axes, tooltips or legend |
| States | No camera-permission / model-loading / empty / error screens |
| Accessibility | No focus management, no `aria-live` for rep count, low-contrast greys, small touch targets |

---

## 2. Technology decision

**MUI requires React.** The app is currently vanilla TypeScript, so the revamp introduces React for the UI layer only.

| Choice | Decision |
| --- | --- |
| UI framework | React (latest) + `@vitejs/plugin-react` |
| Component library | `@mui/material` (Material Design) + `@emotion/react` + `@emotion/styled` |
| Icons | `@mui/icons-material` |
| Charts | `@mui/x-charts` (Bar + Line for history) |
| Fonts | `@fontsource/roboto` (self-hosted, no CDN) |
| State | React context + `useSyncExternalStore` over the existing engine classes — no extra state library |
| Routing | Simple screen state machine in context (camera must stay mounted across screens); no router needed |

Engine code stays framework-agnostic and is consumed through hooks.

> Alternative considered: `@material/web` (Material 3 web components, no React). Rejected because component coverage (data tables, charts, dialogs with forms) is thinner and the ecosystem is smaller. Revisit only if React bundle size becomes a problem.

---

## 3. Design system

Defined once in `src/app/theme.ts` with `createTheme()`.

- **Mode**: dark by default (gym / camera context), light mode toggle in Settings.
- **Palette**
  - `primary` — amber/yellow (brand; tracked joints use the same colour)
  - `secondary` — teal (charts, secondary actions)
  - `success` — good rep / holding
  - `warning` — partial rep / out of frame
  - `error` — form issue (matches red joint highlight)
- **Typography**: Roboto; custom variants
  - `repCount` — display size for the live counter
  - `timer` — tabular numbers for hold / rest timers
- **Shape**: radius 12 for cards/dialogs, 8 for inputs.
- **Spacing**: MUI 8px scale only — no hard-coded px in components.
- **Density**: comfortable on touch (min 48px targets), compact for tables.
- **Motion**: MUI transitions only; respect `prefers-reduced-motion`.
- Remove `src/style.css` except a minimal global reset handled by `<CssBaseline />`.

---

## 4. Information architecture

```
App shell
├── Top AppBar ─ title · current model chip · settings icon
├── Navigation
│   ├── Desktop: NavigationRail / permanent Drawer
│   └── Mobile:  BottomNavigation
│       ├── Train      (exercise library → setup → live workout)
│       ├── History
│       ├── Custom     (custom exercises)
│       └── Settings
└── Camera layer (always mounted; visible only in workout / calibration / auto-detect)
```

**Live workout, rest, calibration and auto-detect are full-screen modes** that hide navigation, so the camera gets maximum space.

---

## 5. Screen specs

### 5.1 Exercise library (Train tab)
- Search `TextField` with search icon.
- Category filter as `Chip` group (All, Lower body, Upper body, Core, Cardio, Holds, Custom, Experimental).
- Responsive `Grid` of `Card` + `CardActionArea`:
  - Title, chips for `view` (side/front icon) and type (reps / timed hold)
  - "Calibrated" check chip when calibration exists
  - "Experimental" outlined warning chip
- Primary `Fab`: **Auto-detect** (sparkle icon).
- Empty state when search has no matches.

### 5.2 Workout setup (Dialog / bottom sheet on mobile)
- Header: exercise name + camera setup hint in an `Alert severity="info"` with camera icon.
- Number inputs as `TextField type="number"` with `InputAdornment` units and inline `helperText` validation.
- `Switch` rows: Voice callouts, Record pose data (with helper text explaining training).
- Calibration `Card`: current thresholds, **Calibrate** / **Use defaults** buttons.
- Actions: **Cancel** (text) · **Start** (contained, primary).

### 5.3 Live workout (full screen)
- Camera + skeleton canvas fills the viewport (`object-fit: cover`, mirrored).
- **Top bar** (translucent `Paper`): back/end `IconButton`, exercise name, `Chip` "Set 2 / 3", target chip.
- **Rep counter**: large `repCount` typography inside a determinate `CircularProgress` ring showing rep progress (0–100%).
- **Feedback**: `Alert` pill under the top bar — `error` for form issues, `warning` for partial reps, `success` for good reps; fades with `Fade`.
- **Stats row**: chips for current angle, phase, L/R counts, last-rep tempo, avg form.
- **Bottom action bar**: Restart set (outlined) · Finish set (contained) · End workout (text, error colour) → confirmation `Dialog`.
- Holds: ring becomes a timer ring (elapsed / target), status chip Holding / Paused.
- `aria-live="polite"` region announcing rep counts.

### 5.4 Rest (full screen)
- Large countdown inside a determinate `CircularProgress` (remaining / total).
- "Next: Set 3 of 3" subtitle, previous set result `Card` (reps, form %).
- Actions: **Skip rest** (contained) · **+15 s** (outlined) · **End workout** (text).

### 5.5 Workout summary
- Hero stat tiles (`Card`): total reps / total hold, avg form, duration.
- Per-set `Table` (MUI `Table` size small) with form % as coloured `Chip`.
- Recording `Card` (if recorded): frames, training samples added, **Download recording**.
- Actions: **View history** · **Done**.

### 5.6 History
- Exercise `Select` + date range `ToggleButtonGroup` (7 d / 30 d / all).
- `@mui/x-charts`: `BarChart` (reps or hold time) with `LineChart` overlay for avg form, proper axes, tooltips, legend.
- Session list: `List` of `ListItem`s (date, exercise, sets summary, form chip) — expandable to set details via `Collapse`.
- **Clear history** → confirmation `Dialog` (replaces `confirm()`).
- Empty state illustration + "Start your first workout" button.

### 5.7 Custom exercises
- `List` with avatar icon per type, secondary text (category · view), and `IconButton`s: edit, export, delete.
- Toolbar: **New** (contained) · **Import** · **Export all**.
- **New / Edit form** in a full-screen `Dialog`:
  - Stepper: 1. Basics (name, category, view, sides) → 2. Metric (3 joint `Autocomplete`s with a small skeleton diagram highlighting the angle) → 3. Thresholds (start / target / hysteresis or hold range) → 4. Review.
  - Inline validation from `validateExercise()` mapped to field `helperText`.
- **Advanced JSON** tab: monospace multiline `TextField`, validation errors in `Alert`.
- Import results in a `Snackbar` ("Imported 3 · skipped 1") with details expandable.

### 5.8 Calibration & auto-detect (full-screen camera modes)
- Floating `Card` at top: title, instruction, `LinearProgress` (time remaining), live value and observed range chips.
- Auto-detect: prediction `Chip` with confidence `LinearProgress`; when stable, primary **Start <exercise>** button; empty-training state with explanation + link to library.

### 5.9 Settings
- Pose model `ToggleButtonGroup` (Lite / Full / Heavy) with helper text and current FPS.
- Theme mode (Dark / Light / System).
- Defaults: sets, reps, rest, voice.
- Data: Clear history · Clear training data · Clear calibrations (each with confirm `Dialog`).
- About: version, privacy note (all processing on-device).

### 5.10 Global states
- **Camera permission**: full-page empty state with explanation and **Try again**.
- **Model loading**: `Backdrop` + `CircularProgress` + model name; switching model shows `LinearProgress` in the AppBar.
- **No person detected**: subtle `Chip` on the camera layer, not a status line.
- **Low FPS**: `Snackbar` suggesting Lite model with an **Switch** action.
- **Errors**: `Alert` with retry.
- All one-off messages via a single `SnackbarProvider` in context.

---

## 6. Architecture

```
src/
  app/
    App.tsx              # shell, providers, screen switch
    theme.ts             # createTheme, custom typography variants
    ScreenContext.tsx    # screen state machine (library, workout, rest, summary, …)
    SnackbarContext.tsx
  camera/
    CameraProvider.tsx   # getUserMedia, video element, detector lifecycle, frame loop
    CameraStage.tsx      # video + overlay canvas, full-bleed
    usePoseFrame.ts      # subscribe to smoothed landmarks
  hooks/
    useWorkout.ts        # wraps Workout + Recorder, exposes state via useSyncExternalStore
    useCalibration.ts
    useAutoDetect.ts
    useSettings.ts / usePrefs.ts / useCustomExercises.ts / useSessions.ts
  screens/
    LibraryScreen.tsx
    WorkoutScreen.tsx
    RestScreen.tsx
    SummaryScreen.tsx
    HistoryScreen.tsx
    CustomScreen.tsx
    SettingsScreen.tsx
    CalibrationScreen.tsx
    AutoDetectScreen.tsx
  components/
    ExerciseCard.tsx, SetupDialog.tsx, RepRing.tsx, FeedbackPill.tsx,
    StatChip.tsx, ConfirmDialog.tsx, ExerciseEditorDialog.tsx, JointPicker.tsx, EmptyState.tsx
  engine/  pose/  storage/  workout/   # unchanged
```

**Performance rules**
- The pose loop runs outside React (in `CameraProvider`), as today.
- Canvas overlay is drawn imperatively via a ref — never through React state.
- HUD state is published through an external store and throttled to ~15 Hz; rep events and phase changes publish immediately.
- Voice callouts remain in the engine-side controller, not in components.

---

## 7. Migration phases

### R1 — Foundation
- [ ] Add deps: `react`, `react-dom`, `@vitejs/plugin-react`, `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`, `@fontsource/roboto`, types
- [ ] `vite.config.ts` with React plugin; `tsconfig` `jsx: react-jsx`
- [ ] `theme.ts`, `CssBaseline`, app shell (AppBar + responsive navigation)
- [ ] `ScreenContext`, `SnackbarContext`, `ConfirmDialog`

### R2 — Camera & live workout
- [ ] `CameraProvider` (port camera + detector + loop from `main.ts`)
- [ ] `CameraStage` (full-bleed video + overlay canvas)
- [ ] `useWorkout` external store
- [ ] `WorkoutScreen`: top bar, `RepRing`, `FeedbackPill`, stat chips, action bar, hold variant
- [ ] Camera-permission and model-loading states

### R3 — Library & setup
- [ ] `LibraryScreen` with search, category chips, `ExerciseCard` grid
- [ ] `SetupDialog` with validation, switches, calibration card

### R4 — Rest & summary
- [ ] `RestScreen` with countdown ring, +15 s, previous set card
- [ ] `SummaryScreen` with stat tiles, set table, recording card

### R5 — History
- [ ] Add `@mui/x-charts`
- [ ] `HistoryScreen` with filters, Bar + Line chart, expandable session list, clear dialog

### R6 — Custom exercises
- [ ] `CustomScreen` list + toolbar
- [ ] `ExerciseEditorDialog` stepper with `JointPicker` diagram
- [ ] JSON tab, import/export with snackbar results

### R7 — Calibration, auto-detect, settings
- [ ] `CalibrationScreen` and `AutoDetectScreen` floating cards
- [ ] `SettingsScreen` (model, theme mode, defaults, data management)
- [ ] Low-FPS snackbar with switch action

### R8 — Polish
- [ ] Responsive pass: phone portrait (camera on floor), tablet, desktop
- [ ] Accessibility: focus order, `aria-live` reps, contrast check, keyboard shortcuts (Space = finish set, Esc = end)
- [ ] Empty / error states everywhere
- [ ] Reduced-motion support

### R9 — Cleanup
- [ ] Delete `src/ui/*` (old DOM UI) and `src/style.css`
- [ ] Shrink `src/main.ts` to `createRoot(...).render(<App />)`
- [ ] Bundle size check; lazy-load History / Custom / Settings screens

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Bundle size (React + MUI + charts) | Tree-shaken imports, lazy-load non-workout screens, check `vite build` output each phase |
| Per-frame re-renders hurting FPS | External store + throttling; canvas drawn imperatively |
| Camera/detector re-created on navigation | Camera lives in a top-level provider that never unmounts |
| Regressions in engine behaviour | Engine untouched; UI only consumes existing APIs |
| Large one-shot rewrite | Phased migration; old UI deleted only in R9 |

---

## 9. Done when

- Every screen uses MUI components and theme tokens — no hand-written CSS colours or px values.
- Works on phone portrait, tablet and desktop.
- No `confirm()` / `alert()`; all feedback via Dialog / Snackbar.
- Live workout holds the same FPS as before the revamp.
- Lighthouse accessibility score ≥ 90.
