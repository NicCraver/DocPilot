#!/usr/bin/env node
/**
 * word-smart-doc 端到端链路：
 * 学习模板 → 模拟 LLM 按章节生成内容 → 灌入产出 docx → 校验正文字号/字体
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const py = join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python3");
const learn = join(root, "scripts", "word-smart-doc-learn.py");
const fill = join(root, "scripts", "word-smart-doc-fill.py");
const styleTest = join(root, "scripts", "test-word-smart-doc.py");
const makeFixtures = join(root, "scripts", "word-smart-doc-test-data", "make-fixtures.py");
const artifacts = join(root, "scripts", "test-artifacts", "word-smart-doc");

if (!existsSync(py)) {
  console.error("未找到 .venv，请先执行: pnpm run word-smart-doc:install");
  process.exit(1);
}

function runPy(args, { json = false } = {}) {
  const r = spawnSync(py, args, { encoding: "utf-8", cwd: root });
  if (r.status !== 0) {
    console.error(r.stdout || r.stderr);
    process.exit(r.status || 1);
  }
  if (json) {
    const v = JSON.parse(r.stdout.trim());
    if (!v.ok) {
      console.error(v.error || r.stdout);
      process.exit(1);
    }
    return v;
  }
  return r.stdout;
}

/** 模拟 smartDocGenerate.ts：按 profile.structure 的 key 生成 sections JSON */
function simulateLlmSections(structure, topic) {
  const sections = {};
  for (const s of structure) {
    sections[s.key] = [
      `【${topic}·${s.title}】本段由模拟 LLM 按章节结构生成，用于端到端链路验证。`,
      `围绕「${s.title}」补充具体措施与数据支撑，确保表述规范、逻辑连贯。`,
    ];
  }
  return sections;
}

function assertBody(docxPath, expectedFont, expectedSize, needles) {
  const script = `
import json, sys
from docx import Document
from docx.oxml.ns import qn

doc = Document(${JSON.stringify(docxPath)})
FONT_ALIASES = {${JSON.stringify(expectedFont)}: {${JSON.stringify(expectedFont)}, "SimSun", "simsun"}}

def font_ok(actual):
    if not actual: return False
    return actual.strip() in FONT_ALIASES.get(${JSON.stringify(expectedFont)}, {${JSON.stringify(expectedFont)}})

def run_size(run, para, doc):
    if run.font.size: return float(run.font.size.pt)
    if para.style and para.style.font and para.style.font.size:
        return float(para.style.font.size.pt)
    n = doc.styles["Normal"]
    return float(n.font.size.pt) if n.font.size else None

def run_ea(run):
    rpr = run._element.rPr
    if rpr is None: return run.font.name
    rf = rpr.find(qn("w:rFonts"))
    return (rf.get(qn("w:eastAsia")) if rf is not None else None) or run.font.name

needles = ${JSON.stringify(needles)}
expected = ${expectedSize}
errors = []
for needle in needles:
    para = next((p for p in doc.paragraphs if needle in p.text), None)
    if para is None:
        errors.append(f"未找到段落: {needle}")
        continue
    sizes = [run_size(r, para, doc) for r in para.runs if run_size(r, para, doc)]
    fonts = [run_ea(r) for r in para.runs]
    if not sizes:
        errors.append(f"{needle}: 无字号")
    elif abs(sum(sizes)/len(sizes) - expected) > 0.6:
        errors.append(f"{needle}: 字号 {sum(sizes)/len(sizes):.1f}pt 期望 {expected}pt")
    if not all(font_ok(f) for f in fonts if f):
        errors.append(f"{needle}: 字体 {fonts}")
print(json.dumps({"ok": len(errors)==0, "errors": errors}, ensure_ascii=False))
`;
  const r = spawnSync(py, ["-c", script], { encoding: "utf-8", cwd: root });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  const res = JSON.parse(r.stdout.trim());
  if (!res.ok) {
    console.error("正文格式校验失败:", res.errors.join("; "));
    process.exit(1);
  }
}

function e2eScenario(label, templatePath, topic, expectedFont, expectedSize, expectedStyleName) {
  console.log(`\n━━━ ${label} ━━━`);
  const library = join(tmpdir(), `wsd-e2e-${Date.now()}-${label}`);
  mkdirSync(library, { recursive: true });

  console.log("1/4 学习模板 …");
  const learnRes = runPy([learn, JSON.stringify({ docx_path: templatePath, dest_dir: library })], { json: true });
  const profile = learnRes.profile;
  const body = profile.styles?.body ?? {};
  console.log("   profile.body:", JSON.stringify(body));

  if (body.size_pt !== expectedSize) {
    console.error(`学习失败: size_pt=${body.size_pt}，期望 ${expectedSize}`);
    process.exit(1);
  }
  if (expectedStyleName && body.style_name !== expectedStyleName) {
    console.error(`学习失败: style_name=${body.style_name}，期望 ${expectedStyleName}`);
    process.exit(1);
  }
  console.log(`   ✓ 学到 ${body.font_ea} ${body.size_pt}pt，样式 ${body.style_name}`);

  console.log("2/4 模拟 LLM 按章节生成内容 …");
  const sections = simulateLlmSections(profile.structure, topic);
  console.log(`   ✓ 生成 ${Object.keys(sections).length} 个章节`);

  console.log("3/4 灌入 Word …");
  const output = join(library, "generated.docx");
  const fillRes = runPy(
    [
      fill,
      JSON.stringify({
        template_dir: library,
        output_path: output,
        content_kind: "sections",
        sections,
        reporter: "链路测试员",
        report_date: "2026-06-06",
      }),
    ],
    { json: true },
  );
  for (const line of fillRes.logs) console.log("  ", line);
  if (!existsSync(output)) {
    console.error("未生成 docx");
    process.exit(1);
  }
  console.log(`   ✓ 已生成 ${output}`);

  console.log("4/4 校验产出正文字号/字体 …");
  const needles = Object.values(sections).map((arr) => arr[0].slice(0, 12));
  assertBody(output, expectedFont, expectedSize, needles);
  console.log(`   ✓ 正文均为 ${expectedFont} ${expectedSize}pt`);

  rmSync(library, { recursive: true, force: true });
  return true;
}

console.log("word-smart-doc 端到端链路测试");
runPy([makeFixtures], {});

e2eScenario(
  "年终模板(Normal小四)",
  join(artifacts, "year-end-template.docx"),
  "2025年度工作总结",
  "宋体",
  12,
  "Normal",
);

e2eScenario(
  "正文样式模板(Normal四号+正文小四)",
  join(artifacts, "realistic-body-style.docx"),
  "数据治理专项报告",
  "宋体",
  12,
  "正文",
);

console.log("\n补充运行格式回归 …");
const st = spawnSync(py, [styleTest], { encoding: "utf-8", cwd: root, stdio: "inherit" });
if (st.status !== 0) process.exit(st.status || 1);

console.log("\n✅ word-smart-doc 端到端链路全部通过。");
