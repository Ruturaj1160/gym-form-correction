import Chip, { type ChipProps } from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";

/** Compact translucent chip for live stats over the camera. */
export function StatChip(props: ChipProps) {
  const { sx, color, ...rest } = props;
  return (
    <Chip
      size="medium"
      color={color}
      variant={color && color !== "default" ? "filled" : "outlined"}
      {...rest}
      sx={[
        (t) => ({
          fontVariantNumeric: "tabular-nums",
          ...(color && color !== "default"
            ? {}
            : {
                bgcolor: alpha(t.palette.background.paper, 0.72),
                backdropFilter: "blur(8px)",
              }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
