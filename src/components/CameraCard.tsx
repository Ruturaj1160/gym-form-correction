import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

/** Floating translucent card pinned to the top of the camera view. */
export function CameraCard({ children }: { children: ReactNode }) {
  return (
    <Card
      variant="elevation"
      elevation={8}
      sx={(t) => ({
        position: "fixed",
        top: t.spacing(2),
        left: "50%",
        transform: "translateX(-50%)",
        width: `min(calc(100% - ${t.spacing(4)}), ${t.spacing(70)})`,
        bgcolor: alpha(t.palette.background.paper, 0.85),
        backdropFilter: "blur(12px)",
        zIndex: 2,
      })}
    >
      <CardContent>{children}</CardContent>
    </Card>
  );
}
