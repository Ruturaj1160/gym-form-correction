import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /<repo>/; dev stays at /.
  base: command === "build" ? "/gym-form-correction/" : "/",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
}));
