import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import { useNotify } from "../app/SnackbarContext";
import { useConfirm } from "../components/ConfirmDialog";
import type { PoseModel } from "../pose/detector";
import { useCamera } from "../hooks/useCamera";
import { useSwitchModel } from "../hooks/useModel";
import { updatePrefs, usePrefs } from "../hooks/usePrefs";
import { updateSettings, useSettings } from "../hooks/useSettings";
import { clearAllCalibrations } from "../storage/calibration";
import {
  clearSessions,
  listSessions,
  type WorkoutPrefs,
} from "../storage/sessions";
import { POSE_MODELS, type ThemeMode } from "../storage/settings";
import { clearSamples, loadSamples } from "../storage/training";

const MODEL_HELP: Record<PoseModel, string> = {
  lite: "Fastest — best for phones and older laptops.",
  full: "Balanced speed and accuracy. Recommended.",
  heavy: "Most accurate — needs a fast computer.",
};

function Section({
  title,
  subheader,
  children,
}: {
  title: string;
  subheader?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subheader={subheader}
        slotProps={{ title: { variant: "h6" } }}
      />
      <CardContent sx={{ pt: 0 }}>{children}</CardContent>
    </Card>
  );
}

type NumericPref = "sets" | "targetReps" | "targetHoldSec" | "restSec";

function DefaultField({
  pref,
  label,
  unit,
  min,
  max,
  prefs,
}: {
  pref: NumericPref;
  label: string;
  unit: string;
  min: number;
  max: number;
  prefs: WorkoutPrefs;
}) {
  const [value, setValue] = useState(String(prefs[pref]));
  const n = Number(value);
  const invalid = !/^\d+$/.test(value) || n < min || n > max;
  return (
    <TextField
      label={label}
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (invalid) setValue(String(prefs[pref]));
        else updatePrefs({ [pref]: n });
      }}
      error={invalid}
      helperText={invalid ? `${min}–${max}` : " "}
      slotProps={{
        input: {
          endAdornment: <InputAdornment position="end">{unit}</InputAdornment>,
        },
        htmlInput: { min, max, inputMode: "numeric" },
      }}
    />
  );
}

function DataRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ alignItems: { sm: "center" }, py: 1.5 }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}

export default function SettingsScreen() {
  const camera = useCamera();
  const settings = useSettings();
  const prefs = usePrefs();
  const switchModel = useSwitchModel();
  const confirm = useConfirm();
  const notify = useNotify();
  const [counts, setCounts] = useState(() => ({
    sessions: listSessions().length,
    samples: loadSamples().length,
  }));

  const clearWith = async (title: string, run: () => void, done: string) => {
    const ok = await confirm({
      title,
      message: "This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    run();
    setCounts({
      sessions: listSessions().length,
      samples: loadSamples().length,
    });
    notify(done, { severity: "success" });
  };

  const gridSx = {
    display: "grid",
    gap: 2,
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, 1fr)",
      md: "repeat(4, 1fr)",
    },
  } as const;

  return (
    <Stack spacing={3} sx={{ maxWidth: (t) => t.spacing(110) }}>
      <Typography variant="h4" component="h1">
        Settings
      </Typography>

      <Section title="Pose model" subheader="Trade speed for accuracy.">
        <Stack spacing={1.5}>
          <ToggleButtonGroup
            exclusive
            value={camera.model}
            disabled={camera.switchingModel}
            onChange={(_, v: PoseModel | null) => v && void switchModel(v)}
            aria-label="Pose model"
          >
            {POSE_MODELS.map((m) => (
              <ToggleButton
                key={m}
                value={m}
                sx={{ px: 3, textTransform: "capitalize" }}
              >
                {m}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary">
            {MODEL_HELP[camera.model]}{" "}
            {camera.fps
              ? `Last measured: ${camera.fps} FPS.`
              : "Frame rate is measured while tracking."}
          </Typography>
        </Stack>
      </Section>

      <Section title="Appearance">
        <ToggleButtonGroup
          exclusive
          value={settings.themeMode}
          onChange={(_, v: ThemeMode | null) =>
            v && updateSettings({ themeMode: v })
          }
          aria-label="Theme"
        >
          <ToggleButton value="dark">
            <DarkModeIcon sx={{ mr: 1 }} /> Dark
          </ToggleButton>
          <ToggleButton value="light">
            <LightModeIcon sx={{ mr: 1 }} /> Light
          </ToggleButton>
          <ToggleButton value="system">
            <SettingsBrightnessIcon sx={{ mr: 1 }} /> System
          </ToggleButton>
        </ToggleButtonGroup>
      </Section>

      <Section
        title="Workout defaults"
        subheader="Pre-filled when you start a workout."
      >
        <Box sx={gridSx}>
          <DefaultField
            pref="sets"
            label="Sets"
            unit="sets"
            min={1}
            max={10}
            prefs={prefs}
          />
          <DefaultField
            pref="targetReps"
            label="Reps per set"
            unit="reps"
            min={1}
            max={100}
            prefs={prefs}
          />
          <DefaultField
            pref="targetHoldSec"
            label="Hold"
            unit="s"
            min={5}
            max={600}
            prefs={prefs}
          />
          <DefaultField
            pref="restSec"
            label="Rest"
            unit="s"
            min={0}
            max={600}
            prefs={prefs}
          />
        </Box>
        <Stack>
          <FormControlLabel
            control={
              <Switch
                checked={prefs.voice}
                onChange={(e) => updatePrefs({ voice: e.target.checked })}
              />
            }
            label="Voice callouts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={prefs.record}
                onChange={(e) => updatePrefs({ record: e.target.checked })}
              />
            }
            label="Record pose data (trains auto-detect)"
          />
        </Stack>
      </Section>

      <Section title="Data" subheader="Stored only in this browser.">
        <Stack divider={<Divider flexItem />}>
          <DataRow
            title="Workout history"
            description={`${counts.sessions} saved workout${counts.sessions === 1 ? "" : "s"}`}
            action={
              <Button
                color="error"
                variant="outlined"
                disabled={!counts.sessions}
                onClick={() =>
                  void clearWith(
                    "Delete all workout history?",
                    clearSessions,
                    "Workout history deleted.",
                  )
                }
              >
                Clear history
              </Button>
            }
          />
          <DataRow
            title="Auto-detect training data"
            description={`${counts.samples} training sample${counts.samples === 1 ? "" : "s"}`}
            action={
              <Button
                color="error"
                variant="outlined"
                disabled={!counts.samples}
                onClick={() =>
                  void clearWith(
                    "Delete auto-detect training data?",
                    clearSamples,
                    "Training data deleted.",
                  )
                }
              >
                Clear training data
              </Button>
            }
          />
          <DataRow
            title="Calibrations"
            description="Personal thresholds for each exercise."
            action={
              <Button
                color="error"
                variant="outlined"
                onClick={() =>
                  void clearWith(
                    "Reset all calibrations?",
                    clearAllCalibrations,
                    "Calibrations reset.",
                  )
                }
              >
                Reset calibrations
              </Button>
            }
          />
        </Stack>
      </Section>

      <Section title="About">
        <Stack spacing={1}>
          <Typography variant="body2">
            Gym Form Correction v{__APP_VERSION__}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everything runs on your device. Your camera feed is never uploaded,
            and workout data stays in this browser. Pose tracking by MediaPipe.
          </Typography>
        </Stack>
      </Section>
    </Stack>
  );
}
