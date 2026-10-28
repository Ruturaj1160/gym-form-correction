import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import { useEngine } from "./CameraProvider";

const LAYER_STYLE: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  objectFit: "cover",
  // Mirror so it feels like a mirror to the user.
  transform: "scaleX(-1)",
};

/** Full-bleed camera + skeleton layer. Always mounted; hidden when not in a camera mode. */
export function CameraStage({ visible }: { visible: boolean }) {
  const engine = useEngine();
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    for (const node of [engine.video, engine.canvas]) {
      Object.assign(node.style, LAYER_STYLE);
      el.appendChild(node);
    }
    void engine.video.play().catch(() => undefined);
  }, [engine]);

  return (
    <Box
      ref={host}
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "common.black",
        visibility: visible ? "visible" : "hidden",
        zIndex: 0,
      }}
    />
  );
}
