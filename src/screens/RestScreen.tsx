import AddIcon from "@mui/icons-material/Add";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect } from "react";
import { fmtClock, formColor } from "../app/format";
import { useEngine } from "../camera/CameraProvider";
import { RepRing } from "../components/RepRing";
import { useEndWorkout } from "../hooks/useEndWorkout";
import { useWorkout } from "../hooks/useWorkout";

const EXTEND_MS = 15_000;

export function RestScreen() {
  const engine = useEngine();
  const view = useWorkout();
  const endWorkout = useEndWorkout();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (e.defaultPrevented || target?.closest("[role=dialog]")) return;
      if (e.key === "Escape") void endWorkout();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [endWorkout]);

  if (!view) return null;
  const { restRemainingMs, restTotalMs, lastSet, config, exercise } = view;
  const seconds = Math.ceil(restRemainingMs / 1000);

  return (
    <Box
      sx={(t) => ({
        position: "fixed",
        inset: 0,
        zIndex: 1,
        display: "grid",
        placeItems: "center",
        p: 2,
        bgcolor: alpha(t.palette.background.default, 0.88),
        backdropFilter: "blur(16px)",
      })}
    >
      <Stack
        spacing={3}
        sx={{
          alignItems: "center",
          textAlign: "center",
          width: "100%",
          maxWidth: 420,
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            {exercise.name}
          </Typography>
          <Typography variant="h4">Rest</Typography>
        </Box>

        <RepRing
          value={restTotalMs ? (restRemainingMs / restTotalMs) * 100 : 0}
          label={String(seconds)}
          caption="seconds"
          color="secondary"
          variant="timer"
        />
        <Typography
          role="timer"
          aria-live="off"
          variant="subtitle1"
          color="text.secondary"
        >
          Next: set {view.setIndex + 2} of {config.sets}
        </Typography>

        {lastSet && (
          <Card sx={{ width: "100%" }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Set {view.setIndex + 1}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: "center", mt: 1 }}
              >
                {lastSet.holdMs !== null ? (
                  <Chip label={`Hold ${fmtClock(lastSet.holdMs, 0)}`} />
                ) : (
                  <>
                    <Chip label={`${lastSet.reps} reps`} />
                    {lastSet.avgScore !== null && (
                      <Chip
                        label={`Form ${lastSet.avgScore}%`}
                        color={formColor(lastSet.avgScore)}
                      />
                    )}
                    {lastSet.partials > 0 && (
                      <Chip
                        label={`${lastSet.partials} partial`}
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", justifyContent: "center" }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<SkipNextIcon />}
            onClick={() => engine.skipRest()}
            autoFocus
          >
            Skip rest
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => engine.extendRest(EXTEND_MS)}
          >
            15 s
          </Button>
          <Button color="error" size="large" onClick={() => void endWorkout()}>
            End workout
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
