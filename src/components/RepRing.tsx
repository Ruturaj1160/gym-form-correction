import Box from "@mui/material/Box";
import CircularProgress, {
  type CircularProgressProps,
} from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

interface Props {
  /** 0–100 */
  value: number;
  label: string;
  caption?: string;
  color?: CircularProgressProps["color"];
  variant?: "repCount" | "timer";
}

/** Large determinate ring with a centred number — the hero of workout / rest screens. */
export function RepRing({
  value,
  label,
  caption,
  color = "primary",
  variant = "repCount",
}: Props) {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down("sm"));
  const size = theme.spacing(small ? 20 : 26);

  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={3.5}
        sx={{ color: alpha(theme.palette.common.white, 0.15) }}
      />
      <CircularProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, value))}
        size={size}
        thickness={3.5}
        color={color}
        sx={{
          position: "absolute",
          left: 0,
          "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant={variant} component="div">
          {label}
        </Typography>
        {caption && (
          <Typography variant="body2" color="text.secondary">
            {caption}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
