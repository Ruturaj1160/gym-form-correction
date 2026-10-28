import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ExerciseDef } from "../engine/types";
import type { WorkoutSummary } from "../camera/engine";

export type Tab = "train" | "history" | "custom" | "settings";

export interface SetupMessage {
  text: string;
  severity: "success" | "info" | "warning" | "error";
}

interface ScreenState {
  tab: Tab;
  setTab: (tab: Tab) => void;
  summary: WorkoutSummary | null;
  showSummary: (summary: WorkoutSummary) => void;
  closeSummary: () => void;
  setup: { exercise: ExerciseDef; message?: SetupMessage } | null;
  openSetup: (exercise: ExerciseDef, message?: SetupMessage) => void;
  closeSetup: () => void;
}

const ScreenContext = createContext<ScreenState | null>(null);

/**
 * Screen state machine for the tabbed part of the app.
 * Full-screen camera modes (workout, calibration, auto-detect) are driven by the engine instead.
 */
export function ScreenProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>("train");
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [setup, setSetup] = useState<ScreenState["setup"]>(null);

  const value = useMemo<ScreenState>(
    () => ({
      tab,
      setTab: (next) => {
        setSummary(null);
        setTabState(next);
      },
      summary,
      showSummary: setSummary,
      closeSummary: () => setSummary(null),
      setup,
      openSetup: (exercise, message) => setSetup({ exercise, message }),
      closeSetup: () => setSetup(null),
    }),
    [tab, summary, setup],
  );

  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
}

export function useScreen(): ScreenState {
  const ctx = useContext(ScreenContext);
  if (!ctx) throw new Error("useScreen must be used inside ScreenProvider");
  return ctx;
}
