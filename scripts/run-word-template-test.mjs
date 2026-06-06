#!/usr/bin/env node
/**
 * Word 模板生成自动化测试（美腾 2025 年终总结样例）
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const venvPy = join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python3");
const script = join(root, "scripts", "word-template-fill.py");
const data = join(root, "scripts", "word-template-test-data");
const template = join(data, "meiteng-2025-template.docx");
const content = join(data, "2025-year-end-content.md");
const output = join(data, "2025-year-end-output.docx");

if (!existsSync(venvPy)) {
  console.error("未找到 .venv，请先执行: pnpm run word-typeset:install");
  process.exit(1);
}

const payload = JSON.stringify({
  template_path: template,
  output_path: output,
  content_path: content,
  content_kind: "markdown",
});

const r = spawnSync(venvPy, [script, payload], { encoding: "utf-8", cwd: root });
if (r.status !== 0) {
  console.error(r.stdout || r.stderr);
  process.exit(r.status ?? 1);
}

const result = JSON.parse(r.stdout.trim());
if (!result.ok) {
  console.error(result.error ?? "未知错误");
  process.exit(1);
}

const required = ["前言", "2.1", "2.2", "结语", "汇报人"];
for (const key of required) {
  const hit = result.logs.some((line) => line.includes(key));
  if (!hit) {
    console.error(`校验失败：日志中未找到「${key}」相关填入记录`);
    process.exit(1);
  }
}

if (!existsSync(output)) {
  console.error("输出文件未生成:", output);
  process.exit(1);
}

console.log("Word 模板生成测试通过。");
console.log(result.logs.join("\n"));
