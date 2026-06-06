#!/usr/bin/env node
/** word-smart-doc 自适应排版自动化测试 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const py = join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python3");
const learn = join(root, "scripts", "word-smart-doc-learn.py");
const fill = join(root, "scripts", "word-smart-doc-fill.py");
const makeFixtures = join(root, "scripts", "word-smart-doc-test-data", "make-fixtures.py");
const data = join(root, "scripts", "word-smart-doc-test-data");
const artifacts = join(root, "scripts", "test-artifacts", "word-smart-doc");

if (!existsSync(py)) {
  console.error("未找到 .venv，请先执行: pnpm run word-smart-doc:install");
  process.exit(1);
}

let r = spawnSync(py, [makeFixtures], { encoding: "utf-8", cwd: root, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status || 1);

const dest = mkdtempSync(join(tmpdir(), "sdfill-"));
r = spawnSync(py, [learn, JSON.stringify({ docx_path: join(artifacts, "year-end-template.docx"), dest_dir: dest })], { encoding: "utf-8", cwd: root });
if (r.status !== 0 || !JSON.parse(r.stdout.trim()).ok) { console.error(r.stdout || r.stderr); process.exit(1); }

const output = join(dest, "out.docx");
r = spawnSync(py, [fill, JSON.stringify({
  template_dir: dest, output_path: output, content_kind: "markdown",
  content_path: join(data, "year-end-content.md"),
})], { encoding: "utf-8", cwd: root });
if (r.status !== 0) { console.error(r.stdout || r.stderr); process.exit(1); }
const res = JSON.parse(r.stdout.trim());
if (!res.ok) { console.error(res.error); process.exit(1); }

const required = ["已移除", "前言", "汇报人：张三", "已生成"];
for (const k of required) {
  if (!res.logs.some((l) => l.includes(k))) {
    console.error(`校验失败：日志缺少「${k}」`); process.exit(1);
  }
}
if (!existsSync(output)) { console.error("输出未生成"); process.exit(1); }
console.log("word-smart-doc 自适应排版测试通过。");
console.log(res.logs.join("\n"));
