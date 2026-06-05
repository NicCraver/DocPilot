#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.platform === "darwin") {
  run("bash", ["scripts/build-docpilot-convert-sidecar.sh"]);
} else if (process.platform === "win32") {
  run("pwsh", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/build-docpilot-convert-sidecar.ps1"]);
} else {
  console.error("build:sidecar 仅支持 macOS 与 Windows");
  process.exit(1);
}
