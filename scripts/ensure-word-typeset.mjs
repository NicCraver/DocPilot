#!/usr/bin/env node
/**
 * 安装 Word 批量排版所需的 Python 依赖（python-docx）
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const req = join(root, "scripts", "word-typeset-requirements.txt");
const venvDir = join(root, ".venv");
const isWin = process.platform === "win32";
const py = isWin ? "python" : "python3";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(venvDir)) {
  console.log("创建 .venv …");
  run(py, ["-m", "venv", venvDir]);
}

const pip = join(venvDir, isWin ? "Scripts" : "bin", isWin ? "pip.exe" : "pip");
run(pip, ["install", "-r", req]);
console.log("Word 排版依赖已就绪。");
