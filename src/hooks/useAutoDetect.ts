import { useStore } from "../app/store";
import { useEngine } from "../camera/CameraProvider";
import type { AutoDetectView } from "../workout/autoDetectSession";

export function useAutoDetect(): AutoDetectView | null {
  return useStore(useEngine().autoDetect);
}
