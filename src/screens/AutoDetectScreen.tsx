import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { useScreen } from "../app/ScreenContext";
import { useNotify } from "../app/SnackbarContext";
import { useEngine } from "../camera/CameraProvider";
import { CameraCard } from "../components/CameraCard";
import { useConfirm } from "../components/ConfirmDialog";
import { useAutoDetect } from "../hooks/useAutoDetect";
import { useCamera } from "../hooks/useCamera";
import { clearSamples } from "../storage/training";

const STATUS_TEXT = {
  waiting: "Start moving — do a few reps of any trained exercise.",
  unsure: "Not sure yet — keep going…",
  detecting: "",
  "no-data": "",
} as const;

export function AutoDetectScreen() {
  const engine = useEngine();
  const view = useAutoDetect();
  const camera = useCamera();
  const confirm = useConfirm();
  const notify = useNotify();
  const { openSetup } = useScreen();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (e.key === "Escape" && !target?.closest("[role=dialog]"))
        engine.stopAutoDetect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  if (!view) return null;

  const clearTraining = async () => {
    const ok = await confirm({
      title: "Delete training data?",
      message: "Auto-detect will forget every exercise it has learned.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    clearSamples();
    engine.stopAutoDetect();
    notify("Training data deleted.", { severity: "success" });
  };

  const start = () => {
    if (!view.ready) return;
    const exercise = view.ready;
    engine.stopAutoDetect();
    openSetup(exercise, {
      text: "Detected automatically — confirm your sets and start.",
      severity: "success",
    });
  };

  return (
    <CameraCard>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AutoAwesomeIcon color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Auto-detect</Typography>
            {view.status !== "no-data" && (
              <Typography variant="body2" color="text.secondary">
                Trained on {view.trainedCount} exercise
                {view.trainedCount === 1 ? "" : "s"}
              </Typography>
            )}
          </Box>
        </Stack>

        {view.status === "no-data" ? (
          <Alert severity="info">
            No training data yet. Run a workout with{" "}
            <strong>Record pose data</strong> turned on for each exercise you
            want detected.
          </Alert>
        ) : (
          <>
            {view.trainedCount === 1 && (
              <Alert severity="warning">
                Only one exercise is trained — record more for useful detection.
              </Alert>
            )}
            {view.prediction ? (
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Looks like
                  </Typography>
                  <Chip color="primary" label={view.prediction.exercise.name} />
                  <Typography
                    variant="body2"
                    sx={{ ml: "auto", fontVariantNumeric: "tabular-nums" }}
                  >
                    {Math.round(view.prediction.confidence * 100)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={view.prediction.confidence * 100}
                  aria-label="Detection confidence"
                />
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {STATUS_TEXT[view.status]}
              </Typography>
            )}
            {!camera.personDetected && (
              <Chip
                color="warning"
                icon={<VideocamOffIcon />}
                label="No person detected"
                sx={{ alignSelf: "flex-start" }}
              />
            )}
          </>
        )}

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}
        >
          {view.status !== "no-data" && (
            <Button
              color="error"
              onClick={() => void clearTraining()}
              sx={{ mr: "auto" }}
            >
              Clear training data
            </Button>
          )}
          <Button onClick={() => engine.stopAutoDetect()}>
            {view.status === "no-data" ? "Back to library" : "Cancel"}
          </Button>
          {view.ready && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={start}
            >
              Start {view.ready.name}
            </Button>
          )}
        </Stack>
      </Stack>
    </CameraCard>
  );
}
