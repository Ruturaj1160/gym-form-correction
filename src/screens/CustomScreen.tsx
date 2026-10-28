import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import RepeatIcon from "@mui/icons-material/Repeat";
import TimerIcon from "@mui/icons-material/Timer";
import TuneIcon from "@mui/icons-material/Tune";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { useNotify } from "../app/SnackbarContext";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ExerciseEditorDialog } from "../components/ExerciseEditorDialog";
import type { ExerciseDef } from "../engine/types";
import { validateExercise } from "../engine/validate";
import { refreshCustomExercises, useCustomExercises } from "../hooks/useCustomExercises";
import {
  deleteCustomExercise,
  saveCustomExercise,
  toCustomId,
} from "../storage/customExercises";
import { downloadJson } from "../storage/localStore";

const MAX_IMPORT_BYTES = 1_000_000;
const MAX_IMPORT_ITEMS = 200;

function exportExercises(list: ExerciseDef[]): void {
  downloadJson(list.length === 1 ? `${list[0].id}.json` : "custom-exercises.json", {
    format: "gym-rep-counter/exercises",
    version: 1,
    exercises: list,
  });
}

/** Parses an import file. Accepts a single exercise, an array, or { exercises: [...] }. */
async function importFile(file: File): Promise<{ imported: number; errors: string[] }> {
  if (file.size > MAX_IMPORT_BYTES) return { imported: 0, errors: ["File too large (max 1 MB)."] };

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { imported: 0, errors: ["Not a valid JSON file."] };
  }

  const items: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { exercises?: unknown }).exercises)
      ? (data as { exercises: unknown[] }).exercises
      : [data];

  let imported = 0;
  const errors: string[] = [];
  for (const item of items.slice(0, MAX_IMPORT_ITEMS)) {
    if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string") {
      const obj = item as { id: string };
      obj.id = toCustomId(obj.id);
    }
    const r = validateExercise(item);
    if (r.ok) {
      saveCustomExercise(r.value);
      imported++;
    } else {
      errors.push(r.error);
    }
  }
  if (items.length > MAX_IMPORT_ITEMS) {
    errors.push(`Only the first ${MAX_IMPORT_ITEMS} exercises were processed.`);
  }
  return { imported, errors };
}

export default function CustomScreen() {
  const list = useCustomExercises();
  const notify = useNotify();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editor, setEditor] = useState<{ exercise?: ExerciseDef } | null>(null);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const { imported, errors } = await importFile(file);
    refreshCustomExercises();
    notify(`Imported ${imported}${errors.length ? ` · skipped ${errors.length}` : ""}.`, {
      severity: errors.length ? (imported ? "warning" : "error") : "success",
      action: errors.length ? { label: "Details", onClick: () => setImportErrors(errors) } : undefined,
    });
  };

  const remove = async (ex: ExerciseDef) => {
    const ok = await confirm({
      title: `Delete "${ex.name}"?`,
      message: "Its calibration and history entries are kept.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteCustomExercise(ex.id);
    refreshCustomExercises();
    notify(`Deleted "${ex.name}".`, { severity: "success" });
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
        <Stack sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1">
            Custom exercises
          </Typography>
          <Typography color="text.secondary">Create your own or import them from a file.</Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditor({})}>
            New
          </Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInput.current?.click()}>
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => exportExercises(list)}
            disabled={!list.length}
          >
            Export all
          </Button>
        </Stack>
      </Stack>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void onImport(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {list.length ? (
        <Card>
          <List disablePadding>
            {list.map((ex, i) => (
              <ListItem
                key={ex.id}
                divider={i < list.length - 1}
                secondaryAction={
                  <Stack direction="row">
                    <Tooltip title="Edit">
                      <IconButton aria-label={`Edit ${ex.name}`} onClick={() => setEditor({ exercise: ex })}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export">
                      <IconButton aria-label={`Export ${ex.name}`} onClick={() => exportExercises([ex])}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton aria-label={`Delete ${ex.name}`} onClick={() => void remove(ex)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
                sx={{ pr: (t) => t.spacing(20) }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}>
                    {ex.type === "hold" ? <TimerIcon /> : <RepeatIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={ex.name}
                  secondary={`${ex.category} · ${ex.view} view · ${ex.type === "hold" ? "timed hold" : "reps"}`}
                />
              </ListItem>
            ))}
          </List>
        </Card>
      ) : (
        <EmptyState
          icon={<TuneIcon />}
          title="No custom exercises yet"
          description="Build an exercise by picking three joints and the angle range, or import one from a JSON file."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditor({})}>
              Create exercise
            </Button>
          }
        />
      )}

      <ExerciseEditorDialog
        open={editor !== null}
        exercise={editor?.exercise}
        onClose={() => setEditor(null)}
        onSaved={(ex) => {
          setEditor(null);
          refreshCustomExercises();
          notify(`Saved "${ex.name}".`, { severity: "success" });
        }}
      />

      <Dialog open={importErrors !== null} onClose={() => setImportErrors(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Skipped exercises</DialogTitle>
        <DialogContent>
          <List dense>
            {importErrors?.map((e, i) => (
              <ListItem key={i}>
                <ListItemText primary={e} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportErrors(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
