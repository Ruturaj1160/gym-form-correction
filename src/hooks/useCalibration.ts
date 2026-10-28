import { useStore } from "../app/store";
import { useEngine } from "../camera/CameraProvider";
import type { CalibrationView } from "../workout/calibrationSession";

export function useCalibration(): CalibrationView | null {
  return useStore(useEngine().calibration);
}
