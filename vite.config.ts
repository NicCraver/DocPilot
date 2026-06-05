/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";

const host = process.env.TAURI_DEV_HOST;
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue(), UnoCSS({ configFile: path.resolve(rootDir, "uno.config.ts") })],
  resolve: {
    alias: {
      "@docpilot/shared-types": path.resolve(rootDir, "packages/shared-types/src/index.ts"),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  test: {
    environment: "node",
  },
});
