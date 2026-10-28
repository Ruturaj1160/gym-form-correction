import Alert, { type AlertColor } from "@mui/material/Alert";
import Fade from "@mui/material/Fade";

export interface Feedback {
  text: string;
  severity: AlertColor;
}

/** Pill-shaped feedback message that fades in/out over the camera. */
export function FeedbackPill({ feedback }: { feedback: Feedback | null }) {
  return (
    <Fade in={!!feedback} unmountOnExit>
      <Alert
        severity={feedback?.severity ?? "info"}
        variant="filled"
        sx={{
          borderRadius: 999,
          px: 3,
          typography: "subtitle1",
          fontWeight: 600,
          boxShadow: 6,
          alignItems: "center",
        }}
      >
        {feedback?.text}
      </Alert>
    </Fade>
  );
}
