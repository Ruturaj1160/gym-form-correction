import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import {
  CATEGORIES,
  SIDE_MODES,
  type Category,
  type ExerciseDef,
  type Joint,
  type SideMode,
} from "../engine/types";
import { validateExercise } from "../engine/validate";
import { EXERCISES } from "../exercises";
import {
  loadCustomExercises,
  saveCustomExercise,
  slugify,
  toCustomId,
  uniqueId,
} from "../storage/customExercises";
import { JOINT_LABEL, JointPicker } from "./JointPicker";

interface FormState {
  name: string;
  category: Category;
  view: "side" | "front";
  side: SideMode;
  setup: string;
  type: "reps" | "hold";
  a: Joint;
  b: Joint;
  c: Joint;
  start: string;
  target: string;
  hysteresis: string;
  minRep: string;
  targetMsg: string;
  holdMin: string;
  holdMax: string;
  holdMsg: string;
}

type Field = keyof FormState;
type Errors = Partial<Record<Field, string>>;

const DEFAULT_FORM: FormState = {
  name: "",
  category: "Custom",
  view: "side",
  side: "auto",
  setup: "Full body in frame.",
  type: "reps",
  a: "hip",
  b: "knee",
  c: "ankle",
  start: "160",
  target: "90",
  hysteresis: "10",
  minRep: "600",
  targetMsg: "Full range of motion",
  holdMin: "160",
  holdMax: "180",
  holdMsg: "Hold the position",
};

const SIDE_LABEL: Record<SideMode, string> = {
  auto: "Auto (most visible side)",
  both: "Both (average)",
  each: "Each side separately",
  left: "Left only",
  right: "Right only",
};

const STEPS = ["Basics", "Metric", "Thresholds", "Review"];
const STEP_FIELDS: Field[][] = [
  ["name", "category", "view", "side", "setup", "type"],
  ["a", "b", "c"],
  [
    "start",
    "target",
    "hysteresis",
    "minRep",
    "targetMsg",
    "holdMin",
    "holdMax",
    "holdMsg",
  ],
];

// Maps validateExercise() error paths to form fields.
const PATH_TO_FIELD: [RegExp, Field][] = [
  [/^name/, "name"],
  [/^setup/, "setup"],
  [/^category/, "category"],
  [/^view/, "view"],
  [/^side/, "side"],
  [/^(primary|conditions\[0\])\.metric/, "b"],
  [/^primary\.start/, "start"],
  [/^primary\.target/, "target"],
  [/^primary\.hysteresis/, "hysteresis"],
  [/^primary:/, "target"],
  [/^minRepDurationMs/, "minRep"],
  [/^formRules/, "targetMsg"],
  [/^conditions\[0\]\.min/, "holdMin"],
  [/^conditions\[0\]\.max/, "holdMax"],
  [/^conditions\[0\]\.message/, "holdMsg"],
  [/^conditions/, "holdMin"],
];

const toNum = (s: string) => (s.trim() === "" ? NaN : Number(s));

/** Returns form values if the exercise fits the guided editor, otherwise null (JSON only). */
function fromExercise(ex: ExerciseDef): FormState | null {
  const base = {
    ...DEFAULT_FORM,
    name: ex.name,
    category: ex.category,
    view: ex.view,
    side: ex.side,
    setup: ex.setup,
  };
  if (ex.type === "reps") {
    const m = ex.primary.metric;
    const rules = ex.formRules ?? [];
    if (
      m.kind !== "angle" ||
      ex.sideAttribution ||
      rules.some((r) => r.kind !== "reachedTarget")
    ) {
      return null;
    }
    const [a, b, c] = m.points;
    if ([a, b, c].some((j) => /^(left|right)_/.test(j))) return null;
    return {
      ...base,
      type: "reps",
      a: a as Joint,
      b: b as Joint,
      c: c as Joint,
      start: String(ex.primary.start),
      target: String(ex.primary.target),
      hysteresis: String(ex.primary.hysteresis),
      minRep: String(ex.minRepDurationMs),
      targetMsg: rules[0]?.message ?? "",
    };
  }
  const [cond, ...more] = ex.conditions;
  if (more.length || cond.metric.kind !== "angle") return null;
  const [a, b, c] = cond.metric.points;
  if ([a, b, c].some((j) => /^(left|right)_/.test(j))) return null;
  return {
    ...base,
    type: "hold",
    a: a as Joint,
    b: b as Joint,
    c: c as Joint,
    holdMin: cond.min === undefined ? "" : String(cond.min),
    holdMax: cond.max === undefined ? "" : String(cond.max),
    holdMsg: cond.message,
  };
}

function toRaw(f: FormState, id: string): unknown {
  const metric = { kind: "angle", points: [f.a, f.b, f.c] };
  const base = {
    id,
    name: f.name,
    category: f.category,
    view: f.view,
    setup: f.setup,
    side: f.side,
  };
  if (f.type === "hold") {
    return {
      ...base,
      type: "hold",
      conditions: [
        {
          message: f.holdMsg,
          metric,
          ...(f.holdMin.trim() ? { min: toNum(f.holdMin) } : {}),
          ...(f.holdMax.trim() ? { max: toNum(f.holdMax) } : {}),
        },
      ],
    };
  }
  return {
    ...base,
    type: "reps",
    primary: {
      metric,
      start: toNum(f.start),
      target: toNum(f.target),
      hysteresis: toNum(f.hysteresis),
    },
    minRepDurationMs: toNum(f.minRep),
    ...(f.targetMsg.trim()
      ? { formRules: [{ kind: "reachedTarget", message: f.targetMsg }] }
      : {}),
  };
}

function takenIds(ignoreId?: string): Set<string> {
  return new Set(
    [...EXERCISES, ...loadCustomExercises()]
      .map((e) => e.id)
      .filter((id) => id !== ignoreId),
  );
}

/** Validates the whole form; returns per-field errors (empty when valid) and the parsed value. */
function validateForm(
  f: FormState,
  id: string,
): { errors: Errors; value?: ExerciseDef } {
  const errors: Errors = {};
  if (new Set([f.a, f.b, f.c]).size < 3)
    errors.b = "Pick three different joints.";
  const r = validateExercise(toRaw(f, id));
  if (!r.ok) {
    const [path, ...rest] = r.error.split(": ");
    const field = PATH_TO_FIELD.find(([re]) => re.test(r.error))?.[1] ?? "name";
    errors[field] ??= rest.join(": ") || path;
  }
  return Object.keys(errors).length || !r.ok
    ? { errors }
    : { errors, value: r.value };
}

interface Props {
  open: boolean;
  /** Exercise to edit; undefined creates a new one. */
  exercise?: ExerciseDef;
  onClose: () => void;
  onSaved: (exercise: ExerciseDef) => void;
}

export function ExerciseEditorDialog({
  open,
  exercise,
  onClose,
  onSaved,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby="editor-title"
    >
      {open && (
        <EditorBody
          key={exercise?.id ?? "new"}
          exercise={exercise}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function EditorBody({ exercise, onClose, onSaved }: Omit<Props, "open">) {
  const initialForm = exercise ? fromExercise(exercise) : DEFAULT_FORM;
  const guidedAvailable = initialForm !== null;
  const [tab, setTab] = useState<"guided" | "json">(
    guidedAvailable ? "guided" : "json",
  );
  const [form, setForm] = useState<FormState>(initialForm ?? DEFAULT_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState(0);
  const [json, setJson] = useState(() =>
    JSON.stringify(
      exercise ?? toRaw(DEFAULT_FORM, "custom-my-exercise"),
      null,
      2,
    ),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const id = exercise?.id ?? uniqueId(slugify(form.name), takenIds());
  const set = <K extends Field>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const text = (
    key: Field,
    label: string,
    opts: { number?: boolean; helper?: string; multiline?: boolean } = {},
  ) => (
    <TextField
      label={label}
      value={form[key]}
      onChange={(e) => set(key, e.target.value as FormState[typeof key])}
      error={!!errors[key]}
      helperText={errors[key] ?? opts.helper ?? " "}
      type={opts.number ? "number" : "text"}
      multiline={opts.multiline}
      fullWidth
      slotProps={opts.number ? { htmlInput: { step: "any" } } : undefined}
    />
  );

  const next = () => {
    const { errors: all } = validateForm(form, id);
    const stepErrors = Object.fromEntries(
      Object.entries(all).filter(([k]) =>
        STEP_FIELDS[step].includes(k as Field),
      ),
    );
    setErrors(stepErrors);
    if (!Object.keys(stepErrors).length) setStep((s) => s + 1);
  };

  const saveGuided = () => {
    const { errors: all, value } = validateForm(form, id);
    if (!value) {
      setErrors(all);
      const firstStep = STEP_FIELDS.findIndex((fields) =>
        fields.some((f) => all[f]),
      );
      setStep(firstStep === -1 ? 0 : firstStep);
      return;
    }
    saveCustomExercise(value);
    onSaved(value);
  };

  const saveJson = () => {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      setJsonError("Invalid JSON.");
      return;
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as { id?: unknown };
      // Editing keeps the original id so calibration and history stay linked.
      obj.id = exercise
        ? exercise.id
        : uniqueId(
            toCustomId(typeof obj.id === "string" ? obj.id : "exercise"),
            takenIds(),
          );
    }
    const r = validateExercise(raw);
    if (!r.ok) {
      setJsonError(r.error);
      return;
    }
    saveCustomExercise(r.value);
    onSaved(r.value);
  };

  return (
    <>
      <DialogTitle
        id="editor-title"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <Box sx={{ flex: 1 }}>
          {exercise ? `Edit ${exercise.name}` : "New exercise"}
        </Box>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, v: "guided" | "json") => setTab(v)}
        sx={{ px: 3 }}
      >
        <Tab value="guided" label="Guided" disabled={!guidedAvailable} />
        <Tab value="json" label="Advanced JSON" />
      </Tabs>

      <DialogContent dividers>
        {tab === "guided" ? (
          <Stack spacing={3}>
            <Stepper activeStep={step} alternativeLabel>
              {STEPS.map((label, i) => (
                <Step key={label} completed={i < step}>
                  <StepLabel error={STEP_FIELDS[i]?.some((f) => errors[f])}>
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {step === 0 && (
              <Stack spacing={1}>
                {text("name", "Name")}
                <ToggleButtonGroup
                  exclusive
                  value={form.type}
                  onChange={(_, v: FormState["type"] | null) =>
                    v && set("type", v)
                  }
                  aria-label="Exercise type"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="reps">Count reps</ToggleButton>
                  <ToggleButton value="hold">Timed hold</ToggleButton>
                </ToggleButtonGroup>
                <Box
                  sx={(t) => ({
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: `repeat(auto-fit, minmax(${t.spacing(26)}, 1fr))`,
                  })}
                >
                  <TextField
                    select
                    label="Category"
                    value={form.category}
                    onChange={(e) =>
                      set("category", e.target.value as Category)
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Camera view"
                    value={form.view}
                    onChange={(e) =>
                      set("view", e.target.value as FormState["view"])
                    }
                  >
                    <MenuItem value="side">Side view</MenuItem>
                    <MenuItem value="front">Front view</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Sides"
                    value={form.side}
                    onChange={(e) => set("side", e.target.value as SideMode)}
                  >
                    {SIDE_MODES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {SIDE_LABEL[s]}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box sx={{ mt: 2 }}>
                  {text("setup", "Camera setup hint", {
                    helper: "Shown before the workout starts.",
                  })}
                </Box>
              </Stack>
            )}

            {step === 1 && (
              <JointPicker
                a={form.a}
                b={form.b}
                c={form.c}
                onChange={(patch) => {
                  setForm((f) => ({ ...f, ...patch }));
                  setErrors((e) => ({
                    ...e,
                    a: undefined,
                    b: undefined,
                    c: undefined,
                  }));
                }}
                error={errors.b ?? errors.a ?? errors.c}
              />
            )}

            {step === 2 &&
              (form.type === "reps" ? (
                <Box
                  sx={(t) => ({
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: `repeat(auto-fit, minmax(${t.spacing(26)}, 1fr))`,
                  })}
                >
                  {text("start", "Start angle (°)", {
                    number: true,
                    helper: "Angle at rest / top of the rep",
                  })}
                  {text("target", "Target angle (°)", {
                    number: true,
                    helper: "Angle that counts as a full rep",
                  })}
                  {text("hysteresis", "Hysteresis (°)", {
                    number: true,
                    helper: "Dead zone that stops jitter",
                  })}
                  {text("minRep", "Min rep time (ms)", {
                    number: true,
                    helper: "Faster movements are ignored",
                  })}
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    {text("targetMsg", "Partial-rep message", {
                      helper: "Shown when the target isn't reached",
                    })}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={(t) => ({
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: `repeat(auto-fit, minmax(${t.spacing(26)}, 1fr))`,
                  })}
                >
                  {text("holdMin", "Min angle (°)", { number: true })}
                  {text("holdMax", "Max angle (°)", { number: true })}
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    {text("holdMsg", "Message when out of range")}
                  </Box>
                </Box>
              ))}

            {step === 3 && (
              <List dense>
                <ListItem>
                  <ListItemText primary="Name" secondary={form.name || "—"} />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Type"
                    secondary={
                      form.type === "reps" ? "Count reps" : "Timed hold"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Category · view · sides"
                    secondary={`${form.category} · ${form.view} view · ${SIDE_LABEL[form.side]}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Angle"
                    secondary={`${JOINT_LABEL[form.a]} → ${JOINT_LABEL[form.b]} → ${JOINT_LABEL[form.c]}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Thresholds"
                    secondary={
                      form.type === "reps"
                        ? `${form.start}° → ${form.target}° · hysteresis ${form.hysteresis}° · min ${form.minRep} ms`
                        : `${form.holdMin || "—"}° to ${form.holdMax || "—"}°`
                    }
                  />
                </ListItem>
              </List>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            {!guidedAvailable && (
              <Alert severity="info">
                This exercise uses features the guided editor doesn't support,
                so it can only be edited as JSON.
              </Alert>
            )}
            {jsonError && <Alert severity="error">{jsonError}</Alert>}
            <TextField
              multiline
              minRows={16}
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                setJsonError(null);
              }}
              slotProps={{
                htmlInput: {
                  spellCheck: false,
                  "aria-label": "Exercise JSON",
                  style: {
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "0.85rem",
                  },
                },
              }}
              fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              Supports every metric kind, form rules and side attribution. Ids
              are kept in the custom namespace.
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {tab === "guided" ? (
          <>
            <Button
              onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="contained" onClick={next}>
                Next
              </Button>
            ) : (
              <Button variant="contained" onClick={saveGuided}>
                Save
              </Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={saveJson}>
              Save
            </Button>
          </>
        )}
      </DialogActions>
    </>
  );
}
