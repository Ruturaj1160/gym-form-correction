import { useCallback, useRef } from "react";
import { useEngine } from "../camera/CameraProvider";
import { useConfirm } from "../components/ConfirmDialog";

/** End-workout with confirmation; shared by the workout and rest screens. */
export function useEndWorkout(): () => Promise<void> {
  const engine = useEngine();
  const confirm = useConfirm();
  const busy = useRef(false);
  return useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const ok = await confirm({
      title: "End workout?",
      message: "Completed sets will be saved.",
      confirmLabel: "End workout",
      destructive: true,
    });
    busy.current = false;
    if (ok) engine.endWorkout();
  }, [engine, confirm]);
}
