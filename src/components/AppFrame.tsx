import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import InsightsIcon from "@mui/icons-material/Insights";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useScreen, type Tab } from "../app/ScreenContext";
import { useCamera } from "../hooks/useCamera";

const NAV: { tab: Tab; label: string; icon: ReactNode }[] = [
  { tab: "train", label: "Train", icon: <FitnessCenterIcon /> },
  { tab: "history", label: "History", icon: <InsightsIcon /> },
  { tab: "custom", label: "Custom", icon: <TuneIcon /> },
  { tab: "settings", label: "Settings", icon: <SettingsIcon /> },
];

/** App shell: AppBar + permanent drawer on desktop, bottom navigation on mobile. */
export function AppFrame({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const { tab, setTab } = useScreen();
  const camera = useCamera();
  const drawerWidth = theme.spacing(28);
  const loading =
    camera.switchingModel || camera.status === "starting" || camera.status === "loading-model";

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        position: "relative",
        zIndex: 1,
        bgcolor: "background.default",
      }}
    >
      {desktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
          }}
        >
          <Toolbar sx={{ gap: 1.5 }}>
            <FitnessCenterIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              Gym Form
            </Typography>
          </Toolbar>
          <List component="nav" aria-label="Main" sx={{ px: 1 }}>
            {NAV.map((n) => (
              <ListItemButton
                key={n.tab}
                selected={tab === n.tab}
                onClick={() => setTab(n.tab)}
                aria-current={tab === n.tab ? "page" : undefined}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {!desktop && <FitnessCenterIcon color="primary" />}
            <Typography variant="h6" component="div" sx={{ flex: 1 }} noWrap>
              Gym Form Correction
            </Typography>
            <Tooltip title="Pose model">
              <Chip size="small" variant="outlined" label={`Model: ${camera.model}`} />
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton aria-label="Settings" onClick={() => setTab("settings")}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
          {loading && <LinearProgress aria-label="Loading pose model" />}
        </AppBar>

        <Container component="main" maxWidth="lg" sx={{ flex: 1, py: 3, pb: { xs: 12, md: 4 } }}>
          {children}
        </Container>
      </Box>

      {!desktop && (
        <Paper
          elevation={8}
          sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: "appBar", pb: "env(safe-area-inset-bottom)" }}
        >
          <BottomNavigation showLabels value={tab} onChange={(_, v: Tab) => setTab(v)}>
            {NAV.map((n) => (
              <BottomNavigationAction key={n.tab} value={n.tab} label={n.label} icon={n.icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
