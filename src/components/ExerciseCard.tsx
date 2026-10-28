import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import RepeatIcon from "@mui/icons-material/Repeat";
import ScienceIcon from "@mui/icons-material/Science";
import TimerIcon from "@mui/icons-material/Timer";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ExerciseDef } from "../engine/types";

interface Props {
  exercise: ExerciseDef;
  calibrated: boolean;
  onClick: () => void;
}

export function ExerciseCard({ exercise, calibrated, onClick }: Props) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea onClick={onClick} sx={{ height: "100%", alignItems: "stretch" }}>
        <CardContent sx={{ height: "100%" }}>
          <Stack spacing={1.5} sx={{ height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {exercise.name}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Chip
                size="small"
                icon={exercise.view === "side" ? <ViewSidebarIcon /> : <PersonIcon />}
                label={`${exercise.view} view`}
              />
              <Chip
                size="small"
                icon={exercise.type === "hold" ? <TimerIcon /> : <RepeatIcon />}
                label={exercise.type === "hold" ? "Timed hold" : "Reps"}
              />
              {calibrated && (
                <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Calibrated" />
              )}
              {exercise.experimental && (
                <Chip size="small" color="warning" variant="outlined" icon={<ScienceIcon />} label="Experimental" />
              )}
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {exercise.setup}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
