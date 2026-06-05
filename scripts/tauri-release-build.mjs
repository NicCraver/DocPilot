#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configs = [
  path.join(root, "src-tauri/tauri.release.conf.json"),
  process.platform === "darwin"
    ? path.join(root, "src-tauri/tauri.release.macos.conf.json")
    : process.platform === "win32"
      ? path.join(root, "src-tauri/tauri.release.windows.conf.json")
      : null,
].filter(Boolean);

const args = ["tauri", "build", ...configs.flatMap((c) => ["--config", c])];
const r = spawnSync("npx", args, { cwd: root, stdio: "inherit", shell: true, env: { ...process.env, CI: process.env.CI || "true" } });
if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);

if (process.platform === "darwin") {
  const post = spawnSync("node", ["scripts/postprocess-dmg.mjs"], { cwd: root, stdio: "inherit" });
  process.exit(post.status ?? 1);
}

process.exit(0);
