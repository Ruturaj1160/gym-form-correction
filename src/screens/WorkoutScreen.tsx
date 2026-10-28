import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ReplayIcon from "@mui/icons-material/Replay";
import SpeedIcon from "@mui/icons-material/Speed";
import StraightenIcon from "@mui/icons-material/Straighten";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import { useEffect } from "react";
import { fmtClock, fmtSec, fmtValue, formColor } from "../app/format";
import { useEngine } from "../camera/CameraProvider";
import type { WorkoutView } from "../camera/engine";
import { FeedbackPill, type Feedback } from "../components/FeedbackPill";
import { RepRing } from "../components/RepRing";
import { StatChip } from "../components/StatChip";
import { VisuallyHidden } from "../components/VisuallyHidden";
import { metricUnit } from "../engine/metrics";
import type { RepPhase } from "../engine/types";
import { useCamera } from "../hooks/useCamera";
import { useEndWorkout } from "../hooks/useEndWorkout";
import { useWorkout } from "../hooks/useWorkout";

const REP_MESSAGE_MS = 1500;

// Generic labels: "eccentric" is lowering for squats but pulling for pull-ups.
const PHASE_LABEL: Record<RepPhase, string> = {
  idle: "Get into position",
  top: "Ready",
  eccentric: "Moving",
  bottom: "Target reached",
  concentric: "Returning",
};

const glass = (opacity = 0.72) => ({
  bgcolor: (t: Theme) => alpha(t.palette.background.paper, opacity),
  backdropFilter: "blur(12px)",
});

function feedbackFor(view: WorkoutView): Feedback | null {
  const s = view.state;
  if (!s) return null;
  if (s.kind === "hold") {
    if (!s.inFrame)
      return { text: "Get your whole body in frame", severity: "warning" };
    return s.issues[0]
      ? { text: s.issues[0].message, severity: "error" }
      : null;
  }
  if (s.issues[0]) return { text: s.issues[0].message, severity: "error" };
  const rep = view.lastRep;
  if (rep && view.now - rep.at < REP_MESSAGE_MS) {
    const good = rep.summary.event.kind === "full" && rep.summary.score >= 90;
    return {
      text: rep.summary.feedback,
      severity: good
        ? "success"
        : rep.summary.event.kind === "full"
          ? "info"
          : "warning",
    };
  }
  return null;
}

export function WorkoutScreen() {
  const engine = useEngine();
  const view = useWorkout();
  const camera = useCamera();
  const endWorkout = useEndWorkout();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let focused controls and open dialogs handle their own keys.
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (e.defaultPrevented || target?.closest("[role=dialog]")) return;
      if (e.code === "Space") {
        if (target?.closest("button, input, textarea")) return;
        e.preventDefault();
        engine.finishSet();
      } else if (e.key === "Escape") {
        void endWorkout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, endWorkout]);

  if (!view) return null;
  const { exercise, config, state } = view;
  const isHold = exercise.type === "hold";
  const unit =
    exercise.type === "reps" ? metricUnit(exercise.primary.metric) : "";

  let ringValue = 0;
  let ringLabel = "0";
  let ringCaption = "";
  let ringColor: "primary" | "success" | "warning" = "primary";
  if (state?.kind === "hold") {
    ringValue = (state.elapsedMs / (config.targetHoldSec * 1000)) * 100;
    ringLabel = fmtClock(state.elapsedMs, 0);
    ringCaption = `of ${fmtClock(config.targetHoldSec * 1000, 0)}`;
    ringColor = state.holding ? "success" : "warning";
  } else if (isHold) {
    ringLabel = fmtClock(0, 0);
    ringCaption = `of ${fmtClock(config.targetHoldSec * 1000, 0)}`;
  } else {
    ringValue = (state?.kind === "reps" ? state.progress : 0) * 100;
    ringLabel = String(state?.kind === "reps" ? state.reps : 0);
    ringCaption = `of ${config.targetReps} reps`;
  }

  const lastFull = view.lastFullRep;
  const reps = state?.kind === "reps" ? state : null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Paper
        square
        elevation={0}
        sx={{
          ...glass(),
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1,
          py: 0.5,
        }}
      >
        <Tooltip title="End workout (Esc)">
          <IconButton
            onClick={() => void endWorkout()}
            aria-label="End workout"
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h6" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {exercise.name}
        </Typography>
        {exercise.experimental && (
          <Chip
            label="Experimental"
            color="warning"
            variant="outlined"
            size="small"
          />
        )}
        <Chip
          label={`Set ${view.setIndex + 1} / ${config.sets}`}
          color="primary"
        />
      </Paper>

      <Stack spacing={1} sx={{ alignItems: "center", mt: 2, px: 2 }}>
        {!camera.personDetected && (
          <StatChip
            icon={<VideocamOffIcon />}
            label="No person detected — step into frame"
          />
        )}
        <FeedbackPill feedback={feedbackFor(view)} />
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Stack spacing={2} sx={{ alignItems: "center", px: 2, pb: 2 }}>
        <Box sx={{ ...glass(0.55), borderRadius: "50%", p: 1 }}>
          <RepRing
            value={ringValue}
            label={ringLabel}
            caption={ringCaption}
            color={ringColor}
            variant={isHold ? "timer" : "repCount"}
          />
        </Box>
        <VisuallyHidden role="status" aria-live="polite">
          {isHold ? "" : `${ringLabel} reps`}
        </VisuallyHidden>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", justifyContent: "center" }}
        >
          {state?.kind === "hold" && (
            <StatChip
              label={state.holding ? "Holding" : "Paused"}
              color={state.holding ? "success" : "default"}
            />
          )}
          {reps && (
            <>
              <StatChip
                icon={<StraightenIcon />}
                label={
                  reps.value === null ? "--" : `${fmtValue(reps.value)}${unit}`
                }
              />
              <StatChip
                label={PHASE_LABEL[reps.phase]}
                color={reps.phase === "bottom" ? "success" : "default"}
              />
              {reps.sideCounts && (
                <StatChip
                  label={`L ${reps.sideCounts.left} · R ${reps.sideCounts.right}`}
                />
              )}
              {lastFull && (
                <StatChip
                  icon={<SpeedIcon />}
                  label={`out ${fmtSec(lastFull.event.eccentricMs)} · back ${fmtSec(lastFull.event.concentricMs)}`}
                />
              )}
              {reps.avgScore !== null && (
                <StatChip
                  label={`Form ${reps.avgScore}%`}
                  color={formColor(reps.avgScore)}
                />
              )}
              {reps.partials > 0 && (
                <StatChip label={`Partial ${reps.partials}`} color="warning" />
              )}
            </>
          )}
        </Stack>
      </Stack>

      <Paper
        square
        elevation={0}
        sx={{
          ...glass(),
          display: "flex",
          gap: 1,
          justifyContent: "center",
          flexWrap: "wrap",
          p: 1.5,
          pb: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={() => engine.restartSet()}
        >
          Restart set
        </Button>
        <Tooltip title="Shortcut: Space" describeChild>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={() => engine.finishSet()}
          >
            Finish set
          </Button>
        </Tooltip>
        <Button color="error" onClick={() => void endWorkout()}>
          End workout
        </Button>
      </Paper>
    </Box>
  );
}
