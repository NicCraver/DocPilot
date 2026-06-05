#!/usr/bin/env node
/**
 * 在项目根创建 .venv 并安装 markitdown[all]，供 Tauri 工具 convert_to_markdown 调用。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const venvDir = path.join(root, ".venv");
const python = isWin
  ? path.join(venvDir, "Scripts", "python.exe")
  : path.join(venvDir, "bin", "python");
const markitdownBin = isWin
  ? path.join(venvDir, "Scripts", "markitdown.exe")
  : path.join(venvDir, "bin", "markitdown");
const requirements = path.join(root, "scripts", "markitdown-requirements.txt");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function findPythonForVenv() {
  const candidates = ["python3.12", "python3.11", "python3.10", "python3"];
  for (const cmd of candidates) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status !== 0) continue;
    const ver = r.stdout || r.stderr || "";
    const m = ver.match(/(\d+)\.(\d+)/);
    if (!m) continue;
    const major = Number(m[1]);
    const minor = Number(m[2]);
    if (major === 3 && minor >= 10 && minor <= 12) {
      console.log(`使用 ${cmd}（${ver.trim()}）`);
      return cmd;
    }
  }
  console.error("需要 Python 3.10–3.12。请安装 python3.12 后重试。");
  process.exit(1);
}

if (!fs.existsSync(venvDir)) {
  const py = findPythonForVenv();
  console.log("创建 Python 虚拟环境 .venv …");
  run(py, ["-m", "venv", venvDir]);
}

console.log("安装 markitdown …");
run(python, ["-m", "pip", "install", "-U", "pip"]);
run(python, ["-m", "pip", "install", "-r", requirements]);

if (!fs.existsSync(markitdownBin)) {
  console.error("未找到 markitdown 可执行文件，请检查安装日志。");
  process.exit(1);
}

const ver = spawnSync(markitdownBin, ["--version"], { encoding: "utf8", cwd: root });
console.log(ver.stdout?.trim() || "markitdown 已安装");
