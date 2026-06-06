#!/usr/bin/env node
/** word-smart-doc 学习引擎自动化测试 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const py = join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python3");
const learn = join(root, "scripts", "word-smart-doc-learn.py");
const makeFixtures = join(root, "scripts", "word-smart-doc-test-data", "make-fixtures.py");
const artifacts = join(root, "scripts", "test-artifacts", "word-smart-doc");

if (!existsSync(py)) {
  console.error("未找到 .venv，请先执行: pnpm run word-smart-doc:install");
  process.exit(1);
}

const mk = spawnSync(py, [makeFixtures], { encoding: "utf-8", cwd: root, stdio: "inherit" });
if (mk.status !== 0) process.exit(mk.status || 1);

function run(docx, expectTitles) {
  const dest = mkdtempSync(join(tmpdir(), "sdlearn-"));
  const payload = JSON.stringify({ docx_path: docx, dest_dir: dest });
  const r = spawnSync(py, [learn, payload], { encoding: "utf-8", cwd: root });
  if (r.status !== 0) { console.error(r.stdout || r.stderr); process.exit(1); }
  const res = JSON.parse(r.stdout.trim());
  if (!res.ok) { console.error(res.error); process.exit(1); }
  const titles = res.profile.structure.map((s) => s.title);
  for (const t of expectTitles) {
    if (!titles.some((x) => x.includes(t))) {
      console.error(`校验失败：未提取到章节「${t}」，实际: ${titles.join(" / ")}`);
      process.exit(1);
    }
  }
  if (!existsSync(join(dest, "original.docx")) || !existsSync(join(dest, "profile.json"))) {
    console.error("骨架或 profile 未落盘"); process.exit(1);
  }
  console.log(`✓ ${docx.split("/").pop()}: ${titles.length} 章节 [${titles.join(" / ")}]`);
}

run(join(artifacts, "year-end-template.docx"), ["前言", "工作成果", "结语"]);
run(join(artifacts, "gov-template.docx"), ["总体要求", "主要任务", "保障措施"]);
console.log("word-smart-doc 学习测试通过。");
