import TuneIcon from "@mui/icons-material/Tune";
import VideocamIcon from "@mui/icons-material/Videocam";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { fmtValue } from "../app/format";
import { useScreen, type SetupMessage } from "../app/ScreenContext";
import { useEngine } from "../camera/CameraProvider";
import type { ExerciseDef, RepExerciseDef } from "../engine/types";
import { useCamera } from "../hooks/useCamera";
import { updatePrefs, usePrefs } from "../hooks/usePrefs";
import { clearCalibration, loadCalibration } from "../storage/calibration";
import type { WorkoutPrefs } from "../storage/sessions";

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  unit: string;
}

function parseIntInRange(v: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(v.trim())) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: NumberFieldProps) {
  const invalid = parseIntInRange(value, min, max) === null;
  return (
    <TextField
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={invalid}
      helperText={invalid ? `${min}–${max}` : " "}
      slotProps={{
        input: {
          endAdornment: <InputAdornment position="end">{unit}</InputAdornment>,
        },
        htmlInput: { min, max, inputMode: "numeric" },
      }}
      fullWidth
    />
  );
}

function CalibrationCard({
  exercise,
  onCalibrate,
}: {
  exercise: RepExerciseDef;
  onCalibrate: () => void;
}) {
  const [cal, setCal] = useState(() => loadCalibration(exercise.id));
  const { start, target } = cal ?? exercise.primary;
  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" } }}
        >
          <TuneIcon color={cal ? "success" : "action"} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">
              {cal ? "Personal calibration" : "Default thresholds"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fmtValue(start)} → {fmtValue(target)}
              {cal &&
                ` · calibrated ${new Date(cal.calibratedAt).toLocaleDateString()}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {cal && (
              <Button
                onClick={() => {
                  clearCalibration(exercise.id);
                  setCal(null);
                }}
              >
                Use defaults
              </Button>
            )}
            <Button variant="outlined" onClick={onCalibrate}>
              {cal ? "Recalibrate" : "Calibrate"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SetupForm({
  exercise,
  message,
}: {
  exercise: ExerciseDef;
  message?: SetupMessage;
}) {
  const engine = useEngine();
  const camera = useCamera();
  const prefs = usePrefs();
  const { closeSetup, openSetup, showSummary } = useScreen();
  const isHold = exercise.type === "hold";

  const [sets, setSets] = useState(String(prefs.sets));
  const [target, setTarget] = useState(
    String(isHold ? prefs.targetHoldSec : prefs.targetReps),
  );
  const [rest, setRest] = useState(String(prefs.restSec));
  const [voice, setVoice] = useState(prefs.voice);
  const [record, setRecord] = useState(prefs.record);

  const setsN = parseIntInRange(sets, 1, 10);
  const targetN = isHold
    ? parseIntInRange(target, 5, 600)
    : parseIntInRange(target, 1, 100);
  const restN = parseIntInRange(rest, 0, 600);
  const valid = setsN !== null && targetN !== null && restN !== null;
  const ready = camera.status === "ready";

  const start = () => {
    if (setsN === null || targetN === null || restN === null) return;
    const next: WorkoutPrefs = {
      ...prefs,
      sets: setsN,
      ...(isHold ? { targetHoldSec: targetN } : { targetReps: targetN }),
      restSec: restN,
      voice,
      record,
    };
    updatePrefs(next);
    closeSetup();
    engine.startWorkout(exercise, next, showSummary);
  };

  const calibrate = () => {
    if (exercise.type !== "reps") return;
    closeSetup();
    engine.startCalibration(exercise, voice, (text, outcome) =>
      openSetup(exercise, {
        text,
        severity:
          outcome === "saved"
            ? "success"
            : outcome === "failed"
              ? "warning"
              : "info",
      }),
    );
  };

  return (
    <>
      <DialogContent>
        <Stack spacing={2.5}>
          {message && <Alert severity={message.severity}>{message.text}</Alert>}
          <Alert severity="info" icon={<VideocamIcon />}>
            {exercise.setup}
          </Alert>

          <Box
            sx={(t) => ({
              display: "grid",
              gap: 2,
              gridTemplateColumns: `repeat(auto-fit, minmax(${t.spacing(18)}, 1fr))`,
            })}
          >
            <NumberField
              label="Sets"
              value={sets}
              onChange={setSets}
              min={1}
              max={10}
              unit="sets"
            />
            {isHold ? (
              <NumberField
                label="Hold"
                value={target}
                onChange={setTarget}
                min={5}
                max={600}
                unit="s"
              />
            ) : (
              <NumberField
                label="Reps per set"
                value={target}
                onChange={setTarget}
                min={1}
                max={100}
                unit="reps"
              />
            )}
            <NumberField
              label="Rest"
              value={rest}
              onChange={setRest}
              min={0}
              max={600}
              unit="s"
            />
          </Box>

          <Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={voice}
                  onChange={(e) => setVoice(e.target.checked)}
                />
              }
              label="Voice callouts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={record}
                  onChange={(e) => setRecord(e.target.checked)}
                />
              }
              label="Record pose data"
            />
            <FormHelperText sx={{ mt: 0, ml: 6 }}>
              Teaches auto-detect this exercise and lets you download the pose
              data.
            </FormHelperText>
          </Stack>

          {exercise.type === "reps" && (
            <CalibrationCard
              key={exercise.id}
              exercise={exercise}
              onCalibrate={calibrate}
            />
          )}

          {!ready && (
            <Alert severity="warning">
              {camera.status === "denied"
                ? "Camera access is blocked — allow it in your browser to start."
                : "Waiting for the camera and pose model…"}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeSetup}>Cancel</Button>
        <Button variant="contained" onClick={start} disabled={!valid || !ready}>
          Start
        </Button>
      </DialogActions>
    </>
  );
}

export function SetupDialog() {
  const { setup, closeSetup } = useScreen();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  // Keep the last content during the close transition.
  const [last, setLast] = useState(setup);
  if (setup && setup !== last) setLast(setup);
  const current = setup ?? last;

  return (
    <Dialog
      open={!!setup}
      onClose={closeSetup}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="setup-title"
    >
      {current && (
        <>
          <DialogTitle id="setup-title">{current.exercise.name}</DialogTitle>
          <SetupForm
            key={`${current.exercise.id}-${current.message?.text ?? ""}`}
            exercise={current.exercise}
            message={current.message}
          />
        </>
      )}
    </Dialog>
  );
}
