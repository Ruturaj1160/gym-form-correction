import CssBaseline from "@mui/material/CssBaseline";
import LinearProgress from "@mui/material/LinearProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ThemeProvider } from "@mui/material/styles";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { CameraProvider, useEngine } from "../camera/CameraProvider";
import { CameraStage } from "../camera/CameraStage";
import { AppFrame } from "../components/AppFrame";
import { ConfirmProvider } from "../components/ConfirmDialog";
import { SetupDialog } from "../components/SetupDialog";
import { useCamera } from "../hooks/useCamera";
import { useSwitchModel } from "../hooks/useModel";
import { useSettings } from "../hooks/useSettings";
import { useWorkout } from "../hooks/useWorkout";
import { AutoDetectScreen } from "../screens/AutoDetectScreen";
import { CalibrationScreen } from "../screens/CalibrationScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { RestScreen } from "../screens/RestScreen";
import { SummaryScreen } from "../screens/SummaryScreen";
import { WorkoutScreen } from "../screens/WorkoutScreen";
import { ScreenProvider, useScreen } from "./ScreenContext";
import { SnackbarProvider, useNotify } from "./SnackbarContext";
import { useStore } from "./store";
import { createAppTheme } from "./theme";

// Not needed during a workout, so keep them out of the initial bundle.
const HistoryScreen = lazy(() => import("../screens/HistoryScreen"));
const CustomScreen = lazy(() => import("../screens/CustomScreen"));
const SettingsScreen = lazy(() => import("../screens/SettingsScreen"));

function TabContent() {
  const { tab, summary } = useScreen();
  if (summary) return <SummaryScreen />;
  switch (tab) {
    case "train":
      return <LibraryScreen />;
    case "history":
      return <HistoryScreen />;
    case "custom":
      return <CustomScreen />;
    case "settings":
      return <SettingsScreen />;
  }
}

function LowFpsNotifier() {
  const camera = useCamera();
  const notify = useNotify();
  const switchModel = useSwitchModel();
  const shown = useRef(false);

  useEffect(() => {
    if (!camera.lowFps || shown.current) return;
    shown.current = true;
    notify(
      "Tracking is running slowly. Switch to the Lite model for smoother results?",
      {
        severity: "warning",
        autoHideMs: 10_000,
        action: { label: "Switch", onClick: () => void switchModel("lite") },
      },
    );
  }, [camera.lowFps, notify, switchModel]);

  return null;
}

function Shell() {
  const engine = useEngine();
  const mode = useStore(engine.mode);
  const workout = useWorkout();
  const cameraMode = mode !== "idle";

  let modeScreen = null;
  if (mode === "workout")
    modeScreen = workout?.phase === "rest" ? <RestScreen /> : <WorkoutScreen />;
  else if (mode === "calibration") modeScreen = <CalibrationScreen />;
  else if (mode === "autodetect") modeScreen = <AutoDetectScreen />;

  return (
    <>
      <CameraStage visible={cameraMode} />
      {cameraMode ? (
        modeScreen
      ) : (
        <AppFrame>
          <Suspense fallback={<LinearProgress />}>
            <TabContent />
          </Suspense>
        </AppFrame>
      )}
      <SetupDialog />
      <LowFpsNotifier />
    </>
  );
}

export function App() {
  const settings = useSettings();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mode =
    settings.themeMode === "system"
      ? prefersDark
        ? "dark"
        : "light"
      : settings.themeMode;
  const theme = useMemo(
    () => createAppTheme(mode, reducedMotion),
    [mode, reducedMotion],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <CameraProvider>
        <ScreenProvider>
          <SnackbarProvider>
            <ConfirmProvider>
              <Shell />
            </ConfirmProvider>
          </SnackbarProvider>
        </ScreenProvider>
      </CameraProvider>
    </ThemeProvider>
  );
}
