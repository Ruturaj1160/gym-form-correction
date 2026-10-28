import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InsightsIcon from "@mui/icons-material/Insights";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { Fragment, useMemo, useState } from "react";
import { fmtClock, fmtDateTime, fmtShortDate, formColor } from "../app/format";
import { useScreen } from "../app/ScreenContext";
import { useNotify } from "../app/SnackbarContext";
import { useConfirm } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { useSessions } from "../hooks/useSessions";
import { clearSessions, type SessionRecord } from "../storage/sessions";

const ALL = "__all__";
const CHART_SESSIONS = 20;
const DAY_MS = 86_400_000;
type Range = "7d" | "30d" | "all";
const RANGE_DAYS: Record<Range, number | null> = {
  "7d": 7,
  "30d": 30,
  all: null,
};

function sessionTotal(s: SessionRecord): number {
  return s.type === "hold"
    ? s.sets.reduce((n, set) => n + (set.holdMs ?? 0), 0) / 1000
    : s.sets.reduce((n, set) => n + set.reps, 0);
}

function sessionForm(s: SessionRecord): number | null {
  const scores = s.sets
    .map((set) => set.avgScore)
    .filter((v): v is number => v !== null);
  return scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
}

function Charts({ sessions }: { sessions: SessionRecord[] }) {
  const theme = useTheme();
  const isHold = sessions[0].type === "hold";
  const xAxis = [
    {
      scaleType: "band" as const,
      data: sessions.map((_, i) => i),
      valueFormatter: (i: number) => fmtShortDate(sessions[i].startedAt),
    },
  ];
  const forms = sessions.map(sessionForm);

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {isHold ? "Hold time per session" : "Reps per session"}
        </Typography>
        <BarChart
          height={260}
          xAxis={xAxis}
          yAxis={[{ min: 0, tickMinStep: 1 }]}
          series={[
            {
              data: sessions.map(sessionTotal),
              label: isHold ? "Hold (s)" : "Total reps",
              color: theme.palette.primary.main,
            },
          ]}
        />
        {!isHold && forms.some((f) => f !== null) && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
              Average form
            </Typography>
            <LineChart
              height={220}
              xAxis={xAxis}
              yAxis={[
                { min: 0, max: 100, valueFormatter: (v: number) => `${v}%` },
              ]}
              series={[
                {
                  data: forms,
                  label: "Avg form %",
                  color: theme.palette.success.main,
                  connectNulls: true,
                },
              ]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SessionDetails({ s }: { s: SessionRecord }) {
  const isHold = s.type === "hold";
  return (
    <Table size="small" sx={{ mb: 1 }}>
      <TableHead>
        <TableRow>
          <TableCell>Set</TableCell>
          <TableCell>{isHold ? "Hold" : "Reps"}</TableCell>
          {!isHold && <TableCell>Form</TableCell>}
          <TableCell align="right">Duration</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {s.sets.map((set, i) => (
          <TableRow key={i}>
            <TableCell>{i + 1}</TableCell>
            <TableCell>
              {isHold ? fmtClock(set.holdMs ?? 0, 0) : set.reps}
            </TableCell>
            {!isHold && (
              <TableCell>
                {set.avgScore === null ? "--" : `${set.avgScore}%`}
              </TableCell>
            )}
            <TableCell align="right">{fmtClock(set.durationMs, 0)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function HistoryScreen() {
  const { sessions, reload } = useSessions();
  const { setTab } = useScreen();
  const confirm = useConfirm();
  const notify = useNotify();
  const [exerciseId, setExerciseId] = useState(
    () => sessions[0]?.exerciseId ?? ALL,
  );
  const [range, setRange] = useState<Range>("30d");
  const [expanded, setExpanded] = useState<string | null>(null);

  const exercises = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sessions)
      if (!m.has(s.exerciseId)) m.set(s.exerciseId, s.exerciseName);
    return [...m];
  }, [sessions]);

  const days = RANGE_DAYS[range];
  const since = days === null ? 0 : Date.now() - days * DAY_MS;
  const filtered = sessions.filter(
    (s) =>
      (exerciseId === ALL || s.exerciseId === exerciseId) &&
      s.startedAt >= since,
  );
  const chartData =
    exerciseId === ALL ? [] : filtered.slice(0, CHART_SESSIONS).reverse();

  const clearAll = async () => {
    const ok = await confirm({
      title: "Delete all workout history?",
      message: "This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    clearSessions();
    reload();
    setExerciseId(ALL);
    notify("Workout history deleted.", { severity: "success" });
  };

  if (!sessions.length) {
    return (
      <EmptyState
        icon={<InsightsIcon />}
        title="No workouts yet"
        description="Finished workouts appear here with charts of your reps and form over time."
        action={
          <Button variant="contained" onClick={() => setTab("train")}>
            Start your first workout
          </Button>
        }
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", flexWrap: "wrap" }}
        useFlexGap
      >
        <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
          History
        </Typography>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteSweepIcon />}
          onClick={() => void clearAll()}
        >
          Clear history
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="Exercise"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          sx={{ minWidth: (t) => t.spacing(30) }}
        >
          <MenuItem value={ALL}>All exercises</MenuItem>
          {exercises.map(([id, name]) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup
          exclusive
          value={range}
          onChange={(_, v: Range | null) => v && setRange(v)}
          aria-label="Date range"
          size="small"
        >
          <ToggleButton value="7d">7 days</ToggleButton>
          <ToggleButton value="30d">30 days</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {chartData.length > 0 && <Charts sessions={chartData} />}
      {exerciseId === ALL && filtered.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          Pick an exercise to see progress charts.
        </Typography>
      )}

      {filtered.length ? (
        <Card>
          <List disablePadding>
            {filtered.map((s, i) => {
              const isHold = s.type === "hold";
              const form = sessionForm(s);
              const open = expanded === s.id;
              return (
                <Fragment key={s.id}>
                  <ListItemButton
                    divider={i < filtered.length - 1 && !open}
                    onClick={() => setExpanded(open ? null : s.id)}
                    aria-expanded={open}
                  >
                    <ListItemText
                      primary={s.exerciseName}
                      secondary={`${fmtDateTime(s.startedAt)} · ${s.sets
                        .map((set) =>
                          isHold ? fmtClock(set.holdMs ?? 0, 0) : set.reps,
                        )
                        .join(" / ")}`}
                    />
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", ml: 1 }}
                    >
                      <Chip
                        size="small"
                        label={
                          isHold
                            ? fmtClock(sessionTotal(s) * 1000, 0)
                            : `${sessionTotal(s)} reps`
                        }
                      />
                      {form !== null && (
                        <Chip
                          size="small"
                          label={`${form}%`}
                          color={formColor(form)}
                        />
                      )}
                      {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Stack>
                  </ListItemButton>
                  <Collapse in={open} unmountOnExit>
                    <Box
                      sx={{
                        px: 2,
                        borderBottom: i < filtered.length - 1 ? 1 : 0,
                        borderColor: "divider",
                      }}
                    >
                      <SessionDetails s={s} />
                    </Box>
                  </Collapse>
                </Fragment>
              );
            })}
          </List>
        </Card>
      ) : (
        <EmptyState
          icon={<InsightsIcon />}
          title="No workouts in this range"
          description="Try a longer date range or another exercise."
        />
      )}
    </Stack>
  );
}
