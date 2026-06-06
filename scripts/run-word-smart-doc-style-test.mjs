#!/usr/bin/env node
/** word-smart-doc 正文字号/字体自动化对比测试 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const py = join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python3");
const test = join(root, "scripts", "test-word-smart-doc.py");
const makeFixtures = join(root, "scripts", "word-smart-doc-test-data", "make-fixtures.py");

if (!existsSync(py)) {
  console.error("未找到 .venv，请先执行: pnpm run word-smart-doc:install");
  process.exit(1);
}

let r = spawnSync(py, [makeFixtures], { encoding: "utf-8", cwd: root, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status || 1);

r = spawnSync(py, [test], { encoding: "utf-8", cwd: root, stdio: "inherit" });
process.exit(r.status || 0);
