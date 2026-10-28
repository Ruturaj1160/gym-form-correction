import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: "center",
        textAlign: "center",
        py: 8,
        px: 2,
        mx: "auto",
        maxWidth: 480,
      }}
    >
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: (t) => t.spacing(10),
          height: (t) => t.spacing(10),
          borderRadius: "50%",
          bgcolor: "action.hover",
          color: "primary.main",
          "& svg": { fontSize: (t) => t.spacing(5) },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  );
}
