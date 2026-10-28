import { useStore } from "../app/store";
import { useEngine } from "../camera/CameraProvider";
import type { CameraState } from "../camera/engine";

export function useCamera(): CameraState {
  return useStore(useEngine().camera);
}
