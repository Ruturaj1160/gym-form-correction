import TimerIcon from "@mui/icons-material/Timer";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { fmtValue } from "../app/format";
import { useEngine } from "../camera/CameraProvider";
import { CameraCard } from "../components/CameraCard";
import { metricUnit } from "../engine/metrics";
import { useCalibration } from "../hooks/useCalibration";
import { useCamera } from "../hooks/useCamera";

export function CalibrationScreen() {
  const engine = useEngine();
  const view = useCalibration();
  const camera = useCamera();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") engine.cancelCalibration();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  if (!view) return null;
  const unit = metricUnit(view.exercise.primary.metric);
  const elapsed = 1 - view.remainingMs / view.totalMs;

  return (
    <CameraCard>
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Calibrating
          </Typography>
          <Typography variant="h6">{view.exercise.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Do 2–3 slow, full reps through your whole range of motion.
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={elapsed * 100}
          aria-label="Calibration time elapsed"
        />

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Chip
            icon={<TimerIcon />}
            label={`${Math.ceil(view.remainingMs / 1000)}s left`}
          />
          <Chip
            label={`Now ${view.value === null ? "--" : `${fmtValue(view.value)}${unit}`}`}
          />
          {view.range && (
            <Chip
              color="primary"
              label={`Range ${fmtValue(view.range.lo)}${unit} – ${fmtValue(view.range.hi)}${unit}`}
            />
          )}
          {!camera.personDetected && (
            <Chip
              color="warning"
              icon={<VideocamOffIcon />}
              label="No person detected"
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          <Button onClick={() => engine.cancelCalibration()}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => engine.completeCalibration()}
          >
            Done
          </Button>
        </Stack>
      </Stack>
    </CameraCard>
  );
}
