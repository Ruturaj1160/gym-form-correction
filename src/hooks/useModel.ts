import { useCallback } from "react";
import { useNotify } from "../app/SnackbarContext";
import { useEngine } from "../camera/CameraProvider";
import type { PoseModel } from "../pose/detector";
import { settingsStore, updateSettings } from "./useSettings";

/** Switches pose model, persisting the choice only if it loads. */
export function useSwitchModel(): (model: PoseModel) => Promise<void> {
  const engine = useEngine();
  const notify = useNotify();
  return useCallback(
    async (model) => {
      const previous = settingsStore.get().model;
      if (model === previous && engine.camera.get().model === model) return;
      updateSettings({ model });
      const ok = await engine.setModel(model);
      if (ok) {
        notify(`Switched to the ${model} model.`, { severity: "success" });
      } else {
        updateSettings({ model: previous });
        notify(`Couldn't load the ${model} model — still using ${previous}.`, { severity: "error" });
      }
    },
    [engine, notify],
  );
}
