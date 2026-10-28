import Box from "@mui/material/Box";
import type { ReactNode } from "react";

/** Content readable by screen readers only. */
export function VisuallyHidden({
  children,
  ...rest
}: {
  children: ReactNode;
  role?: string;
  "aria-live"?: "polite" | "assertive";
}) {
  return (
    <Box
      {...rest}
      sx={{
        position: "absolute",
        // sx treats 1 as 100%, so use explicit 1px for the standard visually-hidden pattern.
        width: "1px",
        height: "1px",
        p: 0,
        m: "-1px",
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {children}
    </Box>
  );
}
