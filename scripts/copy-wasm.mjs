import { cpSync } from "node:fs";

// Serve MediaPipe WASM locally so its version always matches the installed JS package.
cpSync("node_modules/@mediapipe/tasks-vision/wasm", "public/mediapipe/wasm", {
  recursive: true,
});
