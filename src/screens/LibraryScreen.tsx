import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Fab from "@mui/material/Fab";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useScreen } from "../app/ScreenContext";
import { useNotify } from "../app/SnackbarContext";
import { useEngine } from "../camera/CameraProvider";
import { EmptyState } from "../components/EmptyState";
import { ExerciseCard } from "../components/ExerciseCard";
import { CATEGORIES, type Category } from "../engine/types";
import { useAllExercises } from "../hooks/useCustomExercises";
import { useCamera } from "../hooks/useCamera";
import { loadCalibration } from "../storage/calibration";

type Filter = "All" | Category;

function CameraStatus() {
  const engine = useEngine();
  const camera = useCamera();

  if (camera.status === "denied") {
    return (
      <EmptyState
        icon={<VideocamOffIcon />}
        title="Camera access needed"
        description="Allow camera access in your browser to count reps and check your form. Video never leaves your device."
        action={
          <Button variant="contained" onClick={() => void engine.retry()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (camera.status === "error") {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void engine.retry()}>
            Retry
          </Button>
        }
      >
        {camera.error ?? "Something went wrong starting the camera."}
      </Alert>
    );
  }
  if (camera.status !== "ready") {
    return (
      <Alert severity="info" icon={<CircularProgress size="1.25rem" />}>
        {camera.status === "starting" ? "Starting camera…" : `Loading ${camera.model} pose model…`}
      </Alert>
    );
  }
  return null;
}

export function LibraryScreen() {
  const exercises = useAllExercises();
  const engine = useEngine();
  const camera = useCamera();
  const notify = useNotify();
  const { openSetup } = useScreen();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const categories = useMemo(
    () => CATEGORIES.filter((c) => exercises.some((e) => e.category === c)),
    [exercises],
  );
  const q = query.trim().toLowerCase();
  const filtered = exercises.filter(
    (e) =>
      (filter === "All" || e.category === filter) &&
      (!q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)),
  );

  if (camera.status === "denied") return <CameraStatus />;

  return (
    <Stack spacing={3} sx={{ pb: 10 }}>
      <Box>
        <Typography variant="h4" component="h1">
          Train
        </Typography>
        <Typography color="text.secondary">Pick an exercise to start a guided workout.</Typography>
      </Box>

      <CameraStatus />

      <TextField
        placeholder="Search exercises"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
          htmlInput: { "aria-label": "Search exercises" },
        }}
      />

      <Stack
        direction="row"
        spacing={1}
        role="group"
        aria-label="Filter by category"
        sx={{ overflowX: "auto", pb: 0.5 }}
      >
        {(["All", ...categories] as Filter[]).map((c) => (
          <Chip
            key={c}
            label={c}
            color={filter === c ? "primary" : "default"}
            variant={filter === c ? "filled" : "outlined"}
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
          />
        ))}
      </Stack>

      {filtered.length ? (
        <Box
          sx={(t) => ({
            display: "grid",
            gap: 2,
            gridTemplateColumns: `repeat(auto-fill, minmax(${t.spacing(32)}, 1fr))`,
          })}
        >
          {filtered.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              calibrated={!!loadCalibration(ex.id)}
              onClick={() => openSetup(ex)}
            />
          ))}
        </Box>
      ) : (
        <EmptyState
          icon={<SearchOffIcon />}
          title="No exercises found"
          description="Try a different search or category."
          action={
            <Button
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      <Fab
        variant="extended"
        color="primary"
        onClick={() => {
          if (camera.status !== "ready") {
            notify("Camera isn't ready yet.", { severity: "warning" });
            return;
          }
          engine.startAutoDetect(exercises);
        }}
        sx={(t) => ({
          position: "fixed",
          right: t.spacing(3),
          bottom: { xs: t.spacing(10), md: t.spacing(3) },
          zIndex: 2,
        })}
      >
        <AutoAwesomeIcon sx={{ mr: 1 }} />
        Auto-detect
      </Fab>
    </Stack>
  );
}
