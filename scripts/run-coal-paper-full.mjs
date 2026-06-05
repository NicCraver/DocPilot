#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const venvPy = join(root, ".venv", isWin ? "Scripts/python.exe" : "bin/python3");
const py = existsSync(venvPy) ? venvPy : "python3";

const r = spawnSync(py, [join(root, "scripts", "generate-coal-paper-full.py")], {
  stdio: "inherit",
  cwd: root,
});
process.exit(r.status ?? 1);
