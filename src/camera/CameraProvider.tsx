import { createContext, useContext, useEffect, type ReactNode } from "react";
import { settingsStore } from "../hooks/useSettings";
import { AppEngine } from "./engine";

// One engine for the app lifetime so the camera and detector survive navigation.
const engine = new AppEngine(settingsStore.get().model);

const EngineContext = createContext<AppEngine>(engine);

export function CameraProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void engine.start();
  }, []);
  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}

export function useEngine(): AppEngine {
  return useContext(EngineContext);
}
