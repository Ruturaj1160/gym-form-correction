import DownloadIcon from "@mui/icons-material/Download";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { fmtClock, formColor } from "../app/format";
import { useScreen } from "../app/ScreenContext";
import { EmptyState } from "../components/EmptyState";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ flex: "1 1 0", minWidth: (t) => t.spacing(18) }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" component="p" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function SummaryScreen() {
  const { summary, closeSummary, setTab } = useScreen();
  if (!summary) return null;
  const { session, recording } = summary;

  const actions = (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
      <Button onClick={() => setTab("history")}>View history</Button>
      <Button variant="contained" onClick={closeSummary}>
        Done
      </Button>
    </Stack>
  );

  if (!session) {
    return (
      <EmptyState
        icon={<EventBusyIcon />}
        title="No completed sets"
        description="Nothing was saved for this workout."
        action={actions}
      />
    );
  }

  const isHold = session.type === "hold";
  const scores = session.sets.map((s) => s.avgScore).filter((v): v is number => v !== null);
  const avgForm = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const totalDuration = session.sets.reduce((n, s) => n + s.durationMs, 0);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Workout complete
        </Typography>
        <Typography variant="h4">{session.exerciseName}</Typography>
      </Box>

      <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: "wrap" }}>
        <StatTile
          label={isHold ? "Total hold" : "Total reps"}
          value={
            isHold
              ? fmtClock(session.sets.reduce((n, s) => n + (s.holdMs ?? 0), 0), 0)
              : String(session.sets.reduce((n, s) => n + s.reps, 0))
          }
        />
        {!isHold && <StatTile label="Avg form" value={avgForm === null ? "--" : `${avgForm}%`} />}
        <StatTile label="Sets" value={String(session.sets.length)} />
        <StatTile label="Duration" value={fmtClock(totalDuration, 0)} />
      </Stack>

      <Card>
        <Table size="small" aria-label="Sets">
          <TableHead>
            <TableRow>
              <TableCell>Set</TableCell>
              {isHold ? (
                <TableCell>Hold</TableCell>
              ) : (
                <>
                  <TableCell>Reps</TableCell>
                  <TableCell>Partials</TableCell>
                  <TableCell>Form</TableCell>
                </>
              )}
              <TableCell align="right">Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {session.sets.map((s, i) => (
              <TableRow key={i}>
                <TableCell>{i + 1}</TableCell>
                {isHold ? (
                  <TableCell>{fmtClock(s.holdMs ?? 0)}</TableCell>
                ) : (
                  <>
                    <TableCell>{s.reps}</TableCell>
                    <TableCell>{s.partials}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.avgScore === null ? "--" : `${s.avgScore}%`}
                        color={formColor(s.avgScore)}
                      />
                    </TableCell>
                  </>
                )}
                <TableCell align="right">{fmtClock(s.durationMs, 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {recording && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
              <FiberManualRecordIcon color="error" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">Pose recording</Typography>
                <Typography variant="body2" color="text.secondary">
                  {recording.frames.toLocaleString()} frames · {recording.samples} auto-detect training
                  samples added
                </Typography>
              </Box>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={recording.download}>
                Download recording
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {actions}
    </Stack>
  );
}
