#!/usr/bin/env node
/**
 * Word 排版自动化测试入口：确保依赖 → 运行 Python 校验脚本
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const venvPy = join(root, ".venv", isWin ? "Scripts/python.exe" : "bin/python3");
const testScript = join(root, "scripts", "test-word-typeset.py");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(venvPy)) {
  console.log("安装 Word 排版 Python 依赖 …");
  run("node", [join(root, "scripts", "ensure-word-typeset.mjs")]);
}

console.log("运行 Word 排版格式校验 …");
run(venvPy, [testScript]);
