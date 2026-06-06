# word-smart-doc（Word 智能文档/模板库）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建一个完全独立的 `word-smart-doc` 模块：学习任意上传的 Word 文档（提取骨架 docx + 样式 profile + 缩略图）沉淀为模板库，选模板后用「粘贴/上传现成内容自适应排版」或「输入主题由 LLM 按章节结构生成内容」两条路径，产出与模板版式一致的 docx。

**Architecture:** 沿用项目「前端 Composable + Tauri 命令 + Python 引擎」三层模式，但所有代码全新独立实现，不复用、不改动现有 `word-template-fill` / `word-typeset`。混合策略：克隆原 docx 保骨架（页面/页眉页脚/封面/样式表），同时提取 `profile.json`（标题/正文样式 + 章节结构 + 元字段）用于自适应排版。LLM 路径调用现有 `src/agent` 的 Vercel AI SDK 能力。缩略图用 LibreOffice headless 渲染，缺失时降级文本占位。

**Tech Stack:** Vue 3 + UnoCSS + Tauri v2 + Rust；Python 3 + python-docx（复用项目 `.venv`）；LibreOffice headless（缩略图）；Vercel AI SDK（`ai` + `@ai-sdk/openai`）；vitest（前端测试）；Node 测试脚本（`scripts/run-*.mjs`）。

---

## 文件结构

**Python 引擎（全新）**
- Create: `scripts/word-smart-doc-learn.py` — 学习 docx：提取 profile.json + meta.json，调用 LibreOffice 出缩略图，复制 original.docx。
- Create: `scripts/word-smart-doc-fill.py` — 排版灌入：克隆 original.docx，按 profile 删占位、写章节、回填元字段。
- Create: `scripts/ensure-libreoffice.mjs` — 检测 LibreOffice（soffice）是否可用，给出安装指引。

**Rust（全新）**
- Create: `src-tauri/src/tools/word_smart_doc_util.rs` — Python 调用封装（resolve_python / script_path）+ 模板库目录读写（list/rename/delete/profile 更新）+ 缩略图路径。
- Modify: `src-tauri/src/tools/mod.rs` — 注册 `pub mod word_smart_doc_util;`
- Modify: `src-tauri/src/commands.rs` — 新增 6 个 `#[tauri::command]`。
- Modify: `src-tauri/src/lib.rs` — `invoke_handler` 注册新命令。

**前端（全新）**
- Create: `src/lib/smartDocTypes.ts` — TemplateMeta / SmartDocProfile / 生成参数等 TS 类型。
- Create: `src/lib/smartDocStore.ts` — 当前选中模板 id 的 Tauri Store 缓存（`word-smart-doc-config.json`）。
- Create: `src/agent/smartDocGenerate.ts` — 调用 LLM 按 profile.structure 生成结构化章节内容。
- Create: `src/composables/useWordSmartDoc.ts` — 模块状态与 invoke 编排。
- Create: `src/composables/useWordSmartDoc.test.ts` — composable 单元测试（解析/匹配纯逻辑）。
- Create: `src/components/word-smart-doc/WordSmartDoc.vue` — 主 UI（三段 Tab）。
- Create: `src/components/word-smart-doc/FEATURE.md` — 模块上下文+日志。
- Modify: `src/App.vue` — 新增导航与 tab 挂载。

**测试数据与脚本（全新）**
- Create: `scripts/word-smart-doc-test-data/make-fixtures.py` — 用 python-docx 生成样例模板（年终总结 + 公文）与样例内容，避免依赖二进制 fixture。
- Create: `scripts/run-word-smart-doc-learn-test.mjs`
- Create: `scripts/run-word-smart-doc-adaptive-test.mjs`
- Modify: `package.json` — 新增脚本（install/make-fixtures/learn-test/adaptive-test）。

---

### Task 1: LibreOffice 检测脚本

**Files:**
- Create: `scripts/ensure-libreoffice.mjs`

- [ ] **Step 1: 创建检测脚本**

```js
#!/usr/bin/env node
/**
 * 检测 LibreOffice（soffice）是否可用，用于 word-smart-doc 缩略图渲染。
 * 缺失时给出各平台安装指引；不强制安装，调用方可降级为文本占位。
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const CANDIDATES = [
  "soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  "/usr/bin/soffice",
  "/usr/local/bin/soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
];

function findSoffice() {
  for (const c of CANDIDATES) {
    if (c.includes("/") || c.includes("\\")) {
      if (existsSync(c)) return c;
      continue;
    }
    const r = spawnSync(c, ["--version"], { encoding: "utf-8" });
    if (r.status === 0) return c;
  }
  return null;
}

const found = findSoffice();
if (found) {
  console.log(`LibreOffice 已就绪: ${found}`);
  process.exit(0);
}

console.warn("未检测到 LibreOffice，缩略图将降级为文本占位。");
console.warn("安装指引：");
console.warn("  macOS:  brew install --cask libreoffice");
console.warn("  Ubuntu: sudo apt-get install -y libreoffice");
console.warn("  Windows: https://www.libreoffice.org/download/");
process.exit(0);
```

- [ ] **Step 2: 运行验证**

Run: `node scripts/ensure-libreoffice.mjs`
Expected: 打印「LibreOffice 已就绪: ...」或「未检测到 LibreOffice…」并以退出码 0 结束（绝不因缺失而失败）。

- [ ] **Step 3: 在 package.json 注册 install 脚本**

在 `package.json` 的 `scripts` 中，紧跟现有 `"word-typeset:install"` 行后新增：

```json
    "word-smart-doc:install": "node scripts/ensure-word-typeset.mjs && node scripts/ensure-libreoffice.mjs",
```

说明：复用 `ensure-word-typeset.mjs` 安装 python-docx 到 `.venv`（不新增 requirements），再检测 LibreOffice。

- [ ] **Step 4: 提交**

```bash
git add scripts/ensure-libreoffice.mjs package.json
git commit -m "feat(word-smart-doc): 新增 LibreOffice 检测脚本与安装入口"
```

---

### Task 2: 生成测试 fixtures（样例模板与内容）

**Files:**
- Create: `scripts/word-smart-doc-test-data/make-fixtures.py`

- [ ] **Step 1: 编写 fixtures 生成脚本**

```python
#!/usr/bin/env python3
"""用 python-docx 生成 word-smart-doc 测试样例：两份结构不同的模板 + 一份内容。"""
from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, RGBColor

HERE = Path(__file__).resolve().parent


def _heading(doc, text: str, size: int, font_ea: str, bold: bool):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = font_ea
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    rfonts.set(
        "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}eastAsia",
        font_ea,
    )
    return p


def make_year_end_template():
    doc = Document()
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run("2025 年终总结报告")
    r.bold = True
    r.font.size = Pt(22)

    # 红色填写说明（学习时应识别为占位/说明）
    guide = doc.add_paragraph()
    gr = guide.add_run("（请在此处填写内容，红色说明使用后删除）")
    gr.font.color.rgb = RGBColor(0xFF, 0x00, 0x00)
    gr.italic = True

    for h in ["前言", "工作成果", "工作复盘", "未来展望", "结语"]:
        _heading(doc, h, 16, "黑体", True)
        doc.add_paragraph("（此处填写正文）")

    doc.add_paragraph("汇报人：")
    doc.add_paragraph("日期：")
    out = HERE / "year-end-template.docx"
    doc.save(str(out))
    return out


def make_gov_template():
    doc = Document()
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run("关于加强本市数据治理工作的通知")
    r.font.size = Pt(22)
    r.font.name = "方正小标宋简体"

    for h in ["一、总体要求", "二、主要任务", "三、保障措施"]:
        _heading(doc, h, 16, "黑体", False)
        doc.add_paragraph("（此处填写正文）")
    out = HERE / "gov-template.docx"
    doc.save(str(out))
    return out


def make_content_md():
    md = """# 前言
今年是公司高速发展的一年，团队完成了多项关键目标。

# 工作成果
完成核心系统重构，性能提升 40%。
上线智能模板库功能，获得客户好评。

# 工作复盘
项目排期偏紧，需要加强前期评估。

# 未来展望
2026 年将聚焦智能化与稳定性。

# 结语
感谢团队的努力与支持。

汇报人：张三
日期：2026-01-10
"""
    out = HERE / "year-end-content.md"
    out.write_text(md, encoding="utf-8")
    return out


def main():
    HERE.mkdir(parents=True, exist_ok=True)
    print("生成:", make_year_end_template())
    print("生成:", make_gov_template())
    print("生成:", make_content_md())


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 在 package.json 注册脚本**

在 `scripts` 中 `"word-smart-doc:install"` 后新增：

```json
    "word-smart-doc:make-fixtures": "node -e \"const{spawnSync}=require('node:child_process');const p=process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python3';process.exit(spawnSync(p,['scripts/word-smart-doc-test-data/make-fixtures.py'],{stdio:'inherit'}).status||0)\"",
```

- [ ] **Step 3: 运行生成 fixtures**

Run: `pnpm run word-smart-doc:install && pnpm run word-smart-doc:make-fixtures`
Expected: 打印三行「生成: …」，在 `scripts/word-smart-doc-test-data/` 出现 `year-end-template.docx`、`gov-template.docx`、`year-end-content.md`。

- [ ] **Step 4: 提交**

```bash
git add scripts/word-smart-doc-test-data/make-fixtures.py package.json
git commit -m "test(word-smart-doc): 新增样例模板与内容生成脚本"
```

---

### Task 3: Python 学习引擎（提取 profile + 缩略图）

**Files:**
- Create: `scripts/word-smart-doc-learn.py`

CLI 约定：`python word-smart-doc-learn.py '<json>'`，入参 `{docx_path, dest_dir}`，输出 stdout JSON `{ok, profile, meta, thumbnail, logs}`，并把 `original.docx` / `profile.json` / `meta.json` / `thumbnail.png` 写入 `dest_dir`。

- [ ] **Step 1: 编写学习引擎**

```python
#!/usr/bin/env python3
"""学习一份 docx：提取样式 profile 与章节结构，复制骨架并渲染缩略图。"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from docx import Document
from docx.shared import RGBColor

SOFFICE_CANDIDATES = [
    "soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
]

CN_NUM_RE = re.compile(r"^[（(]?[一二三四五六七八九十]+[)）、.]")
DIGIT_RE = re.compile(r"^\d+([.\d]*)?[、.\s]")


def _norm(text: str) -> str:
    return re.sub(r"\s+", "", text.strip())


def _run_is_red(run) -> bool:
    color = run.font.color.rgb if run.font.color and run.font.color.rgb else None
    return color == RGBColor(0xFF, 0x00, 0x00)


def paragraph_is_guide(para) -> bool:
    text = para.text.strip()
    if not text:
        return False
    red = sum(1 for r in para.runs if _run_is_red(r))
    if red and (text.startswith("（") or red >= max(1, len(para.runs) // 2)):
        return True
    return False


def _ea_font(run) -> str | None:
    rpr = run._element.rPr
    if rpr is None or rpr.rFonts is None:
        return run.font.name
    ea = rpr.rFonts.get(
        "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}eastAsia"
    )
    return ea or run.font.name


def _para_size_pt(para) -> float | None:
    for r in para.runs:
        if r.font.size:
            return r.font.size.pt
    return None


def _heading_level(para) -> int | None:
    """返回标题层级（1..），非标题返回 None。"""
    name = (para.style.name or "").lower() if para.style else ""
    if name.startswith("title"):
        return 0  # 文档主标题
    m = re.match(r"heading\s*(\d+)", name)
    if m:
        return int(m.group(1))
    text = para.text.strip()
    if not text or len(text) > 40 or paragraph_is_guide(para):
        return None
    bold_len = sum(len(r.text) for r in para.runs if r.bold)
    if CN_NUM_RE.match(text):
        return 1
    if DIGIT_RE.match(text) and bold_len:
        return 2
    if bold_len >= max(2, len(text) * 0.5) and len(text) <= 20:
        return 1
    return None


def _repr_style(samples: list[tuple[str, float | None, bool, str]]) -> dict[str, Any]:
    """从 (font_ea, size_pt, bold, align) 样本里取众数式代表。"""
    if not samples:
        return {}
    font = max({s[0] for s in samples if s[0]}, key=lambda f: sum(1 for s in samples if s[0] == f), default=None)
    sizes = [s[1] for s in samples if s[1]]
    size = max(set(sizes), key=sizes.count) if sizes else None
    bold = sum(1 for s in samples if s[2]) >= len(samples) / 2
    aligns = [s[3] for s in samples if s[3]]
    align = max(set(aligns), key=aligns.count) if aligns else "left"
    out: dict[str, Any] = {}
    if font:
        out["font_ea"] = font
    if size:
        out["size_pt"] = round(size, 1)
    out["bold"] = bold
    out["align"] = align
    return out


def _align_name(para) -> str:
    a = para.alignment
    return {0: "left", 1: "center", 2: "right", 3: "justify"}.get(int(a), "left") if a is not None else "left"


def extract_profile(doc: Document) -> dict[str, Any]:
    title_s: list = []
    heading_s: dict[int, list] = {}
    body_s: list = []
    structure: list[dict[str, Any]] = []
    meta_fields: list[dict[str, str]] = []
    counter = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        if paragraph_is_guide(para):
            continue
        sample = (_ea_font(para.runs[0]) if para.runs else None, _para_size_pt(para),
                  any(r.bold for r in para.runs), _align_name(para))
        if "汇报人" in text and len(text) < 20:
            meta_fields.append({"label": "汇报人", "pattern": "汇报人[：:]"})
            continue
        if text.startswith("日期") and len(text) < 20:
            meta_fields.append({"label": "日期", "pattern": "日期[：:]"})
            continue
        level = _heading_level(para)
        if level == 0:
            title_s.append(sample)
            continue
        if level is not None:
            heading_s.setdefault(level, []).append(sample)
            counter += 1
            structure.append({"key": f"auto_{counter}", "title": text, "level": level})
            continue
        body_s.append(sample)

    styles: dict[str, Any] = {}
    if title_s:
        styles["title"] = {**_repr_style(title_s), "align": "center"}
    for lvl, samples in heading_s.items():
        styles[f"heading{lvl}"] = _repr_style(samples)
    styles["body"] = {**_repr_style(body_s), "first_line_indent_chars": 2, "line_spacing": 1.5} if body_s else {"first_line_indent_chars": 2, "line_spacing": 1.5}

    # 去重 meta_fields
    seen = set()
    dedup_meta = []
    for m in meta_fields:
        if m["label"] not in seen:
            seen.add(m["label"])
            dedup_meta.append(m)

    return {
        "version": 1,
        "styles": styles,
        "structure": structure,
        "meta_fields": dedup_meta,
    }


def render_thumbnail(docx_path: Path, dest_dir: Path, logs: list[str]) -> str | None:
    soffice = next((c for c in SOFFICE_CANDIDATES if c == "soffice" or Path(c).exists()), None)
    if soffice is None:
        logs.append("未检测到 LibreOffice，跳过缩略图")
        return None
    try:
        subprocess.run(
            [soffice, "--headless", "--convert-to", "png", "--outdir", str(dest_dir), str(docx_path)],
            check=True, capture_output=True, timeout=60,
        )
        produced = dest_dir / (docx_path.stem + ".png")
        target = dest_dir / "thumbnail.png"
        if produced.exists():
            produced.replace(target)
            logs.append("已生成缩略图")
            return str(target)
        logs.append("缩略图转换未产出 PNG")
        return None
    except Exception as e:  # noqa: BLE001
        logs.append(f"缩略图生成失败（降级）：{e}")
        return None


def learn(docx_path: str, dest_dir: str) -> dict[str, Any]:
    logs: list[str] = []
    src = Path(docx_path)
    if not src.is_file():
        raise FileNotFoundError(f"模板不存在: {docx_path}")
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)

    original = dest / "original.docx"
    shutil.copy2(src, original)
    logs.append(f"已保存骨架: {original.name}")

    doc = Document(str(original))
    profile = extract_profile(doc)
    (dest / "profile.json").write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
    logs.append(f"已提取 profile：{len(profile['structure'])} 个章节，{len(profile['styles'])} 类样式")

    thumb = render_thumbnail(original, dest, logs)

    meta = {
        "name": src.stem,
        "description": "",
        "section_count": len(profile["structure"]),
        "has_thumbnail": bool(thumb),
    }
    (dest / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"ok": True, "profile": profile, "meta": meta, "thumbnail": thumb, "logs": logs}


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "缺少 JSON 参数"}, ensure_ascii=False))
        sys.exit(1)
    try:
        payload = json.loads(sys.argv[1])
        result = learn(payload["docx_path"], payload["dest_dir"])
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 手动验证学习引擎（年终总结模板）**

Run:
```bash
.venv/bin/python3 scripts/word-smart-doc-learn.py "$(node -e "console.log(JSON.stringify({docx_path:'scripts/word-smart-doc-test-data/year-end-template.docx',dest_dir:'/tmp/sdtest/yearend'}))")"
```
Expected: stdout JSON `ok:true`；`profile.structure` 含「前言/工作成果/工作复盘/未来展望/结语」5 节；`/tmp/sdtest/yearend/` 出现 `original.docx`、`profile.json`、`meta.json`（有无 thumbnail.png 取决于是否装了 LibreOffice，缺失不报错）。

- [ ] **Step 3: 手动验证公文模板（验证非硬编码）**

Run:
```bash
.venv/bin/python3 scripts/word-smart-doc-learn.py "$(node -e "console.log(JSON.stringify({docx_path:'scripts/word-smart-doc-test-data/gov-template.docx',dest_dir:'/tmp/sdtest/gov'}))")"
```
Expected: `profile.structure` 含「一、总体要求 / 二、主要任务 / 三、保障措施」3 节（中文序号被识别为 level 1），证明结构提取与硬编码无关。

- [ ] **Step 4: 提交**

```bash
git add scripts/word-smart-doc-learn.py
git commit -m "feat(word-smart-doc): 新增学习引擎（提取 profile/结构 + LibreOffice 缩略图）"
```

---

### Task 4: Python 排版灌入引擎

**Files:**
- Create: `scripts/word-smart-doc-fill.py`

CLI 约定：`python word-smart-doc-fill.py '<json>'`，入参
`{template_dir, output_path, content_kind, content_path?, content_text?, sections?, reporter?, report_date?}`。
`template_dir` 为模板库条目目录（含 original.docx + profile.json）。`sections` 为 LLM 路径直接传入的 `{key: [段落...]}`（优先于 content_*）。输出 stdout JSON `{ok, results, logs}`（与现有排版工具一致的信封，便于 Rust 复用解析）。

- [ ] **Step 1: 编写灌入引擎**

```python
#!/usr/bin/env python3
"""按 profile 把内容灌入 original.docx 骨架，产出排版后的 docx。"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any

from docx import Document
from docx.enum.text import WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.shared import Pt, RGBColor
from docx.text.paragraph import Paragraph

NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _norm(t: str) -> str:
    return re.sub(r"\s+", "", t.strip())


def _run_is_red(run) -> bool:
    color = run.font.color.rgb if run.font.color and run.font.color.rgb else None
    return color == RGBColor(0xFF, 0x00, 0x00)


def paragraph_is_guide(para: Paragraph) -> bool:
    text = para.text.strip()
    if not text:
        return False
    red = sum(1 for r in para.runs if _run_is_red(r))
    if red and (text.startswith("（") or red >= max(1, len(para.runs) // 2)):
        return True
    return False


def is_placeholder(para: Paragraph) -> bool:
    text = para.text.strip()
    return text in {"（此处填写正文）", "（此处填写内容）"} or paragraph_is_guide(para)


def set_east_asia(run, font: str) -> None:
    run.font.name = font
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.rFonts if rpr.rFonts is not None else OxmlElement("w:rFonts")
    if rpr.rFonts is None:
        rpr.append(rfonts)
    rfonts.set(f"{NS}eastAsia", font)


def apply_body_style(para: Paragraph, style: dict[str, Any]) -> None:
    pf = para.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = style.get("line_spacing", 1.5)
    indent_chars = style.get("first_line_indent_chars", 0)
    size_pt = style.get("size_pt", 12)
    if indent_chars:
        pf.first_line_indent = Pt(size_pt * indent_chars)
    for run in para.runs:
        if style.get("font_ea"):
            set_east_asia(run, style["font_ea"])
        run.font.size = Pt(size_pt)
        run.font.color.rgb = RGBColor(0, 0, 0)
        run.italic = False
        run.bold = bool(style.get("bold", False))


def insert_after(anchor: Paragraph, text: str) -> Paragraph:
    new_p = OxmlElement("w:p")
    anchor._p.addnext(new_p)
    para = Paragraph(new_p, anchor._parent)
    if text:
        para.add_run(text)
    return para


def remove_para(para: Paragraph) -> None:
    el = para._element
    parent = el.getparent()
    if parent is not None:
        parent.remove(el)


def split_paragraphs(text: str) -> list[str]:
    out = []
    for chunk in re.split(r"\n\s*\n+", text.replace("\r\n", "\n")):
        line = chunk.strip()
        if line:
            out.append(line)
    return out


def parse_markdown(raw: str, structure: list[dict]) -> tuple[dict[str, list[str]], dict[str, str]]:
    titles = {_norm(s["title"]): s["key"] for s in structure}
    sections: dict[str, list[str]] = {s["key"]: [] for s in structure}
    meta: dict[str, str] = {}
    order = [s["key"] for s in structure]
    cur = order[0] if order else None
    buf: list[str] = []

    def flush():
        nonlocal buf
        if cur and buf:
            sections.setdefault(cur, []).extend(split_paragraphs("\n".join(buf)))
        buf = []

    for line in raw.replace("\r\n", "\n").split("\n"):
        s = line.strip()
        if not s:
            buf.append("")
            continue
        m = re.match(r"^#{1,6}\s+(.+)$", s)
        head = m.group(1).strip() if m else s
        mr = re.match(r"汇报人[：:]\s*(.+)$", s)
        md = re.match(r"日期[：:]\s*(.+)$", s)
        if mr:
            meta["reporter"] = mr.group(1).strip(); continue
        if md:
            meta["date"] = md.group(1).strip(); continue
        key = titles.get(_norm(head))
        if key and (m or len(s) < 40):
            flush(); cur = key; continue
        if cur:
            buf.append(s)
    flush()
    return sections, meta


def load_sections(payload: dict, structure: list[dict]) -> tuple[dict[str, list[str]], dict[str, str]]:
    if payload.get("sections"):
        return {k: list(v) for k, v in payload["sections"].items()}, {}
    text = payload.get("content_text")
    if not text and payload.get("content_path"):
        p = Path(payload["content_path"])
        if p.suffix.lower() == ".docx":
            doc = Document(str(p))
            lines = [para.text.strip() for para in doc.paragraphs
                     if para.text.strip() and not paragraph_is_guide(para)]
            text = "\n".join(lines)
        else:
            text = p.read_text(encoding="utf-8")
    if not text:
        raise ValueError("请提供内容文件、文本或 sections")
    return parse_markdown(text, structure)


def fill(payload: dict) -> dict[str, Any]:
    logs: list[str] = []
    tdir = Path(payload["template_dir"])
    original = tdir / "original.docx"
    profile = json.loads((tdir / "profile.json").read_text(encoding="utf-8"))
    structure = profile.get("structure", [])
    styles = profile.get("styles", {})
    body_style = styles.get("body", {"size_pt": 12, "first_line_indent_chars": 2, "line_spacing": 1.5})

    out = Path(payload["output_path"])
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(original, out)
    doc = Document(str(out))

    sections, meta = load_sections(payload, structure)
    reporter = payload.get("reporter") or meta.get("reporter")
    report_date = payload.get("report_date") or meta.get("date")

    # 删占位/说明段
    removed = 0
    for para in list(doc.paragraphs):
        if is_placeholder(para):
            remove_para(para); removed += 1
    logs.append(f"已移除 {removed} 段占位/说明")

    titles = {_norm(s["title"]): s["key"] for s in structure}
    filled: set[str] = set()
    for para in list(doc.paragraphs):
        key = titles.get(_norm(para.text))
        if not key:
            continue
        parts = sections.get(key, [])
        if not parts:
            continue
        anchor = para
        for part in parts:
            np = insert_after(anchor, part)
            apply_body_style(np, body_style)
            anchor = np
        filled.add(key)
        logs.append(f"已填入章节「{para.text.strip()[:30]}」{len(parts)} 段")

    # 未匹配到模板标题的内容按顺序续写文末（不丢内容）
    leftover = [(s["key"], sections.get(s["key"], [])) for s in structure
                if s["key"] not in filled and sections.get(s["key"])]
    if leftover:
        for key, parts in leftover:
            doc.add_paragraph(next((s["title"] for s in structure if s["key"] == key), key))
            for part in parts:
                p = doc.add_paragraph(part)
                apply_body_style(p, body_style)
        logs.append(f"{len(leftover)} 个未匹配章节已续写到文末")

    for para in list(doc.paragraphs):
        t = para.text.strip()
        if t.startswith("汇报人") and reporter:
            for r in list(para.runs):
                r._r.getparent().remove(r._r)
            para.add_run(f"汇报人：{reporter}")
            logs.append(f"已填写汇报人：{reporter}")
        elif t.startswith("日期") and report_date:
            for r in list(para.runs):
                r._r.getparent().remove(r._r)
            para.add_run(f"日期：{report_date}")
            logs.append(f"已填写日期：{report_date}")

    doc.save(str(out))
    logs.append(f"已生成: {out}")
    return {"ok": True, "results": [{"input": payload.get("content_path") or "(text/sections)", "output": str(out)}], "logs": logs}


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "缺少 JSON 参数"}, ensure_ascii=False)); sys.exit(1)
    try:
        payload = json.loads(sys.argv[1])
        print(json.dumps(fill(payload), ensure_ascii=False))
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False)); sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 手动验证自适应排版（Markdown 内容）**

Run:
```bash
.venv/bin/python3 scripts/word-smart-doc-fill.py "$(node -e "console.log(JSON.stringify({template_dir:'/tmp/sdtest/yearend',output_path:'/tmp/sdtest/out-yearend.docx',content_kind:'markdown',content_path:'scripts/word-smart-doc-test-data/year-end-content.md'}))")"
```
Expected: `ok:true`；logs 含「已移除 N 段占位/说明」「已填入章节「前言」…」「已填写汇报人：张三」「已生成: /tmp/sdtest/out-yearend.docx」；该 docx 存在。

- [ ] **Step 3: 手动验证 LLM 路径（sections 直传）**

Run:
```bash
.venv/bin/python3 scripts/word-smart-doc-fill.py "$(node -e "console.log(JSON.stringify({template_dir:'/tmp/sdtest/gov',output_path:'/tmp/sdtest/out-gov.docx',content_kind:'sections',sections:{auto_1:['总体要求正文一段。'],auto_2:['主要任务正文。'],auto_3:['保障措施正文。']}}))")"
```
Expected: `ok:true`；三个 `auto_*` 章节内容写入对应标题下；`out-gov.docx` 存在。

- [ ] **Step 4: 提交**

```bash
git add scripts/word-smart-doc-fill.py
git commit -m "feat(word-smart-doc): 新增排版灌入引擎（自适应 + LLM sections 双路径）"
```

---

### Task 5: Node 自动化测试脚本（learn + adaptive）

**Files:**
- Create: `scripts/run-word-smart-doc-learn-test.mjs`
- Create: `scripts/run-word-smart-doc-adaptive-test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 编写 learn 测试**

```js
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
const data = join(root, "scripts", "word-smart-doc-test-data");

if (!existsSync(py)) {
  console.error("未找到 .venv，请先执行: pnpm run word-smart-doc:install");
  process.exit(1);
}

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

run(join(data, "year-end-template.docx"), ["前言", "工作成果", "结语"]);
run(join(data, "gov-template.docx"), ["总体要求", "主要任务", "保障措施"]);
console.log("word-smart-doc 学习测试通过。");
```

- [ ] **Step 2: 编写 adaptive 测试**

```js
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
const data = join(root, "scripts", "word-smart-doc-test-data");

if (!existsSync(py)) {
  console.error("未找到 .venv，请先执行: pnpm run word-smart-doc:install");
  process.exit(1);
}

const dest = mkdtempSync(join(tmpdir(), "sdfill-"));
let r = spawnSync(py, [learn, JSON.stringify({ docx_path: join(data, "year-end-template.docx"), dest_dir: dest })], { encoding: "utf-8", cwd: root });
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
```

- [ ] **Step 3: 注册 package.json 脚本**

在 `scripts` 中 `"word-smart-doc:make-fixtures"` 后新增：

```json
    "word-smart-doc:learn-test": "node scripts/run-word-smart-doc-learn-test.mjs",
    "word-smart-doc:adaptive-test": "node scripts/run-word-smart-doc-adaptive-test.mjs",
```

- [ ] **Step 4: 运行两个测试**

Run: `pnpm run word-smart-doc:make-fixtures && pnpm run word-smart-doc:learn-test && pnpm run word-smart-doc:adaptive-test`
Expected: 两个测试均打印「…测试通过。」，退出码 0。

- [ ] **Step 5: 提交**

```bash
git add scripts/run-word-smart-doc-learn-test.mjs scripts/run-word-smart-doc-adaptive-test.mjs package.json
git commit -m "test(word-smart-doc): 新增学习与自适应排版自动化测试"
```

---

### Task 6: Rust util（Python 调用 + 模板库目录管理）

**Files:**
- Create: `src-tauri/src/tools/word_smart_doc_util.rs`
- Modify: `src-tauri/src/tools/mod.rs:6`（在 `pub mod word_typeset_util;` 后加一行）

- [ ] **Step 1: 创建 util（含 Python 解析复刻 + 库目录读写）**

> 说明：`resolve_python` / `script_path` 逻辑与现有 `word_template_util.rs` 思路一致但**独立实现**（不 `use` 其私有函数）。模板库根目录用 Tauri app data 目录，通过 `AppHandle` 传入。

```rust
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

const INSTALL_HINT: &str =
    "请先安装依赖：在项目根执行 `pnpm run word-smart-doc:install`。";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateMeta {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub section_count: u32,
    #[serde(default)]
    pub has_thumbnail: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FillResult {
    pub results: Vec<FillItem>,
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FillItem {
    pub input: String,
    pub output: String,
}

fn project_root_candidates() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(v) = std::env::var("DOC_PILOT_ROOT") {
        if !v.trim().is_empty() {
            roots.push(PathBuf::from(v.trim()));
        }
    }
    roots.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."));
    if let Ok(cwd) = std::env::current_dir() {
        let mut dir = cwd.as_path();
        loop {
            roots.push(dir.to_path_buf());
            match dir.parent() {
                Some(p) => dir = p,
                None => break,
            }
        }
    }
    roots
}

fn venv_python(root: &Path) -> PathBuf {
    if cfg!(windows) {
        root.join(".venv").join("Scripts").join("python.exe")
    } else {
        root.join(".venv").join("bin").join("python3")
    }
}

fn resolve_python() -> Result<PathBuf, String> {
    if let Ok(bin) = std::env::var("DOC_PILOT_PYTHON") {
        let path = PathBuf::from(bin.trim());
        if path.is_file() {
            return Ok(path);
        }
    }
    for root in project_root_candidates() {
        let root = root.canonicalize().unwrap_or(root);
        let py = venv_python(&root);
        if py.is_file() {
            return Ok(py);
        }
    }
    for name in ["python3", "python"] {
        if Command::new(name).arg("--version").output().map(|o| o.status.success()).unwrap_or(false) {
            return Ok(PathBuf::from(name));
        }
    }
    Err(INSTALL_HINT.into())
}

fn script_path(name: &str) -> Result<PathBuf, String> {
    for root in project_root_candidates() {
        let root = root.canonicalize().unwrap_or(root);
        let s = root.join("scripts").join(name);
        if s.is_file() {
            return Ok(s);
        }
    }
    Err(format!("未找到 scripts/{name}"))
}

fn run_python(script: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let python = resolve_python()?;
    let script = script_path(script)?;
    let json = serde_json::to_string(&payload).map_err(|e| format!("序列化失败: {e}"))?;
    let output = Command::new(&python)
        .arg(&script)
        .arg(&json)
        .output()
        .map_err(|e| format!("无法启动脚本 ({e})。{INSTALL_HINT}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
        if v.get("ok").and_then(|b| b.as_bool()) == Some(true) {
            return Ok(v);
        }
        if let Some(e) = v.get("error").and_then(|s| s.as_str()) {
            return Err(e.to_string());
        }
    }
    let detail = if !stderr.trim().is_empty() { stderr.trim() } else { stdout.trim() };
    Err(format!("脚本执行失败: {detail}"))
}

fn gen_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let rand = std::process::id();
    format!("tpl-{ts}-{rand}")
}

pub fn learn_template(library_dir: &Path, docx_path: &str, name: Option<String>, description: Option<String>) -> Result<TemplateMeta, String> {
    let id = gen_id();
    let dest = library_dir.join(&id);
    let v = run_python("word-smart-doc-learn.py", serde_json::json!({
        "docx_path": docx_path,
        "dest_dir": dest.to_string_lossy(),
    }))?;
    let meta_v = v.get("meta").cloned().unwrap_or_default();
    let mut meta: TemplateMeta = serde_json::from_value(serde_json::json!({
        "id": id,
        "name": name.unwrap_or_else(|| meta_v.get("name").and_then(|s| s.as_str()).unwrap_or("未命名模板").to_string()),
        "description": description.unwrap_or_default(),
        "section_count": meta_v.get("section_count").and_then(|n| n.as_u64()).unwrap_or(0),
        "has_thumbnail": meta_v.get("has_thumbnail").and_then(|b| b.as_bool()).unwrap_or(false),
    })).map_err(|e| format!("解析 meta 失败: {e}"))?;
    // 把最终 meta（含用户命名）写回 meta.json
    write_meta(&dest, &meta)?;
    meta.id = dest.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
    Ok(meta)
}

fn write_meta(dir: &Path, meta: &TemplateMeta) -> Result<(), String> {
    let path = dir.join("meta.json");
    let json = serde_json::json!({
        "name": meta.name,
        "description": meta.description,
        "section_count": meta.section_count,
        "has_thumbnail": meta.has_thumbnail,
    });
    fs::write(&path, serde_json::to_string_pretty(&json).unwrap_or_default())
        .map_err(|e| format!("写 meta.json 失败: {e}"))
}

pub fn list_templates(library_dir: &Path) -> Result<Vec<TemplateMeta>, String> {
    let mut out = Vec::new();
    if !library_dir.exists() {
        return Ok(out);
    }
    for entry in fs::read_dir(library_dir).map_err(|e| format!("读库失败: {e}"))?.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }
        let meta_path = dir.join("meta.json");
        if !meta_path.is_file() {
            continue;
        }
        let raw = fs::read_to_string(&meta_path).unwrap_or_default();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap_or_default();
        out.push(TemplateMeta {
            id: dir.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string(),
            name: v.get("name").and_then(|s| s.as_str()).unwrap_or("未命名模板").to_string(),
            description: v.get("description").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            section_count: v.get("section_count").and_then(|n| n.as_u64()).unwrap_or(0) as u32,
            has_thumbnail: v.get("has_thumbnail").and_then(|b| b.as_bool()).unwrap_or(false),
        });
    }
    Ok(out)
}

pub fn rename_template(library_dir: &Path, id: &str, name: &str) -> Result<(), String> {
    let dir = library_dir.join(id);
    let meta_path = dir.join("meta.json");
    let raw = fs::read_to_string(&meta_path).map_err(|e| format!("读 meta 失败: {e}"))?;
    let mut v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| format!("解析 meta 失败: {e}"))?;
    v["name"] = serde_json::Value::String(name.to_string());
    fs::write(&meta_path, serde_json::to_string_pretty(&v).unwrap_or_default())
        .map_err(|e| format!("写 meta 失败: {e}"))
}

pub fn delete_template(library_dir: &Path, id: &str) -> Result<(), String> {
    let dir = library_dir.join(id);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| format!("删除失败: {e}"))?;
    }
    Ok(())
}

pub fn read_profile(library_dir: &Path, id: &str) -> Result<serde_json::Value, String> {
    let path = library_dir.join(id).join("profile.json");
    let raw = fs::read_to_string(&path).map_err(|e| format!("读 profile 失败: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("解析 profile 失败: {e}"))
}

pub fn update_profile(library_dir: &Path, id: &str, profile: serde_json::Value) -> Result<(), String> {
    let path = library_dir.join(id).join("profile.json");
    fs::write(&path, serde_json::to_string_pretty(&profile).unwrap_or_default())
        .map_err(|e| format!("写 profile 失败: {e}"))
}

#[allow(clippy::too_many_arguments)]
pub fn generate(
    library_dir: &Path,
    id: &str,
    output_path: &str,
    content_kind: &str,
    content_path: Option<String>,
    content_text: Option<String>,
    sections: Option<serde_json::Value>,
    reporter: Option<String>,
    report_date: Option<String>,
) -> Result<FillResult, String> {
    let template_dir = library_dir.join(id);
    if !template_dir.join("original.docx").is_file() {
        return Err("模板不存在或已损坏".into());
    }
    let v = run_python("word-smart-doc-fill.py", serde_json::json!({
        "template_dir": template_dir.to_string_lossy(),
        "output_path": output_path,
        "content_kind": content_kind,
        "content_path": content_path,
        "content_text": content_text,
        "sections": sections,
        "reporter": reporter,
        "report_date": report_date,
    }))?;
    let results = v.get("results").and_then(|r| serde_json::from_value(r.clone()).ok()).unwrap_or_default();
    let logs = v.get("logs").and_then(|l| serde_json::from_value(l.clone()).ok()).unwrap_or_default();
    Ok(FillResult { results, logs })
}
```

- [ ] **Step 2: 注册模块**

在 `src-tauri/src/tools/mod.rs` 第 6 行 `pub mod word_typeset_util;` 后新增一行：

```rust
pub mod word_smart_doc_util;
```

- [ ] **Step 3: 编译检查**

Run: `cd src-tauri && cargo check`
Expected: 编译通过（可能有未使用 warning，后续命令接入后消除）。

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/tools/word_smart_doc_util.rs src-tauri/src/tools/mod.rs
git commit -m "feat(word-smart-doc): 新增 Rust util（Python 调用 + 模板库目录管理）"
```

---

### Task 7: Tauri 命令（6 个）+ 注册

**Files:**
- Modify: `src-tauri/src/commands.rs`（在文件末尾、`#[cfg(test)]` 之前新增命令）
- Modify: `src-tauri/src/lib.rs:25`（在 `generate_word_from_template,` 后新增）

模板库根目录：`{app_data_dir}/smart-doc-library`，由 `AppHandle` 解析。

- [ ] **Step 1: 在 commands.rs 顶部 use 区补充导入**

在 `commands.rs` 文件已有 `use tauri::State;`（约第 13 行）后新增一行：

```rust
use tauri::Manager;
```

- [ ] **Step 2: 在 commands.rs 的 `#[cfg(test)]` 模块之前插入命令**

> 即插在现有 `pub async fn format_docx_text(...)` 函数之后、`#[cfg(test)] mod tests` 之前。

```rust
fn smart_doc_library_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法解析应用数据目录: {e}"))?;
    let dir = base.join("smart-doc-library");
    std::fs::create_dir_all(&dir).map_err(|e| format!("无法创建模板库目录: {e}"))?;
    Ok(dir)
}

#[tauri::command]
pub async fn smart_doc_learn_template(
    app: tauri::AppHandle,
    docx_path: String,
    name: Option<String>,
    description: Option<String>,
) -> Result<crate::tools::word_smart_doc_util::TemplateMeta, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::learn_template(&dir, &docx_path, name, description)
}

#[tauri::command]
pub async fn smart_doc_list_templates(
    app: tauri::AppHandle,
) -> Result<Vec<crate::tools::word_smart_doc_util::TemplateMeta>, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::list_templates(&dir)
}

#[tauri::command]
pub async fn smart_doc_rename_template(
    app: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<(), String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::rename_template(&dir, &id, &name)
}

#[tauri::command]
pub async fn smart_doc_delete_template(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::delete_template(&dir, &id)
}

#[tauri::command]
pub async fn smart_doc_get_profile(
    app: tauri::AppHandle,
    id: String,
) -> Result<serde_json::Value, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::read_profile(&dir, &id)
}

#[tauri::command]
pub async fn smart_doc_update_profile(
    app: tauri::AppHandle,
    id: String,
    profile: serde_json::Value,
) -> Result<(), String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::update_profile(&dir, &id, profile)
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub async fn smart_doc_generate(
    app: tauri::AppHandle,
    id: String,
    output_path: String,
    content_kind: String,
    content_path: Option<String>,
    content_text: Option<String>,
    sections: Option<serde_json::Value>,
    reporter: Option<String>,
    report_date: Option<String>,
) -> Result<crate::tools::word_smart_doc_util::FillResult, String> {
    let dir = smart_doc_library_dir(&app)?;
    crate::tools::word_smart_doc_util::generate(
        &dir, &id, &output_path, &content_kind, content_path, content_text, sections, reporter,
        report_date,
    )
}
```

> 注：这里共 7 个命令（含 `smart_doc_get_profile`，UI 需要读取 profile 来展示章节）。

- [ ] **Step 3: 在 lib.rs 注册命令**

在 `src-tauri/src/lib.rs` 的 `invoke_handler` 中，`commands::generate_word_from_template,`（第 25 行）之后新增：

```rust
            commands::smart_doc_learn_template,
            commands::smart_doc_list_templates,
            commands::smart_doc_rename_template,
            commands::smart_doc_delete_template,
            commands::smart_doc_get_profile,
            commands::smart_doc_update_profile,
            commands::smart_doc_generate,
```

- [ ] **Step 4: 编译检查**

Run: `cd src-tauri && cargo check`
Expected: 编译通过，无 word_smart_doc_util 相关 dead_code warning。

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(word-smart-doc): 新增 7 个 Tauri 命令并注册"
```

---

### Task 8: 前端类型 + Store + LLM 生成

**Files:**
- Create: `src/lib/smartDocTypes.ts`
- Create: `src/lib/smartDocStore.ts`
- Create: `src/agent/smartDocGenerate.ts`

- [ ] **Step 1: 创建类型定义**

```ts
export interface SmartDocStyle {
  font_ascii?: string;
  font_ea?: string;
  size_pt?: number;
  bold?: boolean;
  align?: string;
  line_spacing?: number;
  first_line_indent_chars?: number;
  outline_level?: number;
}

export interface SmartDocSection {
  key: string;
  title: string;
  level: number;
  placeholder?: boolean;
}

export interface SmartDocProfile {
  version: number;
  styles: Record<string, SmartDocStyle>;
  structure: SmartDocSection[];
  meta_fields: Array<{ label: string; pattern: string }>;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  section_count: number;
  has_thumbnail: boolean;
}

export interface SmartDocFillItem {
  input: string;
  output: string;
}

export interface SmartDocFillResult {
  results: SmartDocFillItem[];
  logs: string[];
}

export type SmartDocContentMode = "adaptive" | "llm";
export type AdaptiveInput = "file" | "text";
```

- [ ] **Step 2: 创建 Store（当前选中模板 id）**

```ts
import { load } from "@tauri-apps/plugin-store";
import { waitForTauri } from "./waitForTauri";

const STORE_PATH = "word-smart-doc-config.json";
const KEY = "currentTemplateId";

let storePromise: ReturnType<typeof load> | null = null;

async function getStore() {
  if (!(await waitForTauri())) return null;
  if (!storePromise) {
    storePromise = load(STORE_PATH, { autoSave: true });
  }
  return storePromise;
}

export async function loadCurrentTemplateId(): Promise<string | null> {
  try {
    const store = await getStore();
    if (!store) return null;
    return (await store.get<string>(KEY)) ?? null;
  } catch (e) {
    console.error("加载当前模板 id 失败:", e);
    return null;
  }
}

export async function saveCurrentTemplateId(id: string | null): Promise<void> {
  const store = await getStore();
  if (!store) return;
  await store.set(KEY, id);
  await store.save();
}
```

- [ ] **Step 3: 创建 LLM 生成器（按 profile.structure 逐节生成）**

> 复用现有 `src/agent/providers.ts` 的 `createChatModel` 与 `ai` 的 `generateText`。要求模型输出严格 JSON（`{key: [段落...]}`），并做容错解析。

```ts
import { generateText } from "ai";
import { createChatModel } from "./providers";
import type { ProviderSettings } from "../composables/useProviderSettings";
import type { SmartDocSection } from "../lib/smartDocTypes";

export interface GenerateSectionsParams {
  topic: string;
  hints: string;
  structure: SmartDocSection[];
  settings: ProviderSettings;
}

function buildPrompt(topic: string, hints: string, structure: SmartDocSection[]): string {
  const outline = structure
    .map((s) => `- key=${s.key}（层级${s.level}）：${s.title}`)
    .join("\n");
  return [
    "你是一名专业的中文公文/报告撰写助手。",
    "请根据给定主题与要点，按下方章节结构逐节撰写正文内容。",
    "",
    `主题：${topic}`,
    hints.trim() ? `要点提示：${hints.trim()}` : "",
    "",
    "章节结构：",
    outline,
    "",
    "输出要求：",
    "1. 只输出一个 JSON 对象，键为上面的 key，值为该章节的段落字符串数组。",
    "2. 每个章节 1-4 个自然段，内容具体、通顺、符合中文写作习惯。",
    "3. 不要输出 Markdown 代码块标记，不要输出额外解释。",
    '示例：{"auto_1":["第一段……","第二段……"],"auto_2":["……"]}',
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJson(text: string): Record<string, string[]> {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (Array.isArray(v)) {
      out[k] = v.map((x) => String(x)).filter((x) => x.trim());
    } else if (typeof v === "string" && v.trim()) {
      out[k] = [v.trim()];
    }
  }
  return out;
}

export async function generateSections(
  params: GenerateSectionsParams,
): Promise<Record<string, string[]>> {
  const { topic, hints, structure, settings } = params;
  if (!topic.trim()) throw new Error("请输入文档主题");
  if (!structure.length) throw new Error("当前模板没有可生成的章节结构");
  const model = createChatModel(settings);
  const { text } = await generateText({
    model,
    prompt: buildPrompt(topic, hints, structure),
  });
  try {
    const sections = extractJson(text);
    if (!Object.keys(sections).length) {
      throw new Error("模型未返回有效章节内容");
    }
    return sections;
  } catch (e) {
    throw new Error(`解析模型输出失败：${String(e)}`);
  }
}
```

- [ ] **Step 4: 编译/类型检查**

Run: `pnpm run check`
Expected: 无类型错误（新增文件被纳入检查）。若 `check` 脚本未包含新路径，仍应通过全局 `vue-tsc`；如报路径未覆盖，下一步测试会调用到这些模块间接验证。

- [ ] **Step 5: 提交**

```bash
git add src/lib/smartDocTypes.ts src/lib/smartDocStore.ts src/agent/smartDocGenerate.ts
git commit -m "feat(word-smart-doc): 新增前端类型、Store 与 LLM 章节生成器"
```

---

### Task 9: Composable + 单元测试

**Files:**
- Create: `src/composables/useWordSmartDoc.ts`
- Create: `src/composables/useWordSmartDoc.test.ts`

- [ ] **Step 1: 创建 composable**

```ts
import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  AdaptiveInput,
  SmartDocContentMode,
  SmartDocFillResult,
  SmartDocProfile,
  TemplateMeta,
} from "../lib/smartDocTypes";
import { loadCurrentTemplateId, saveCurrentTemplateId } from "../lib/smartDocStore";
import { generateSections } from "../agent/smartDocGenerate";
import type { ProviderSettings } from "./useProviderSettings";

const DOCX_FILTERS = [{ name: "Word 文档", extensions: ["docx"] }];
const CONTENT_FILTERS = [
  { name: "Word / 文本 / Markdown", extensions: ["docx", "txt", "md", "markdown"] },
];

export function useWordSmartDoc() {
  const templates = ref<TemplateMeta[]>([]);
  const currentId = ref<string | null>(null);
  const currentProfile = ref<SmartDocProfile | null>(null);

  const contentMode = ref<SmartDocContentMode>("adaptive");
  const adaptiveInput = ref<AdaptiveInput>("text");
  const contentPath = ref<string | null>(null);
  const contentText = ref("");
  const topic = ref("");
  const hints = ref("");
  const reporter = ref("");
  const reportDate = ref("");
  const generatedSections = ref<Record<string, string[]> | null>(null);

  const logs = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastOutputPath = ref<string | null>(null);

  const currentTemplate = computed(
    () => templates.value.find((t) => t.id === currentId.value) ?? null,
  );
  const canGenerate = computed(() => {
    if (!currentId.value) return false;
    if (contentMode.value === "llm") return generatedSections.value != null;
    if (adaptiveInput.value === "file") return Boolean(contentPath.value);
    return contentText.value.trim().length > 0;
  });

  function appendLog(line: string) {
    logs.value = [...logs.value, line];
  }
  function fileBasename(path: string) {
    return path.split(/[/\\]/).pop() || path;
  }

  async function refreshTemplates() {
    try {
      templates.value = await invoke<TemplateMeta[]>("smart_doc_list_templates");
      const saved = await loadCurrentTemplateId();
      if (saved && templates.value.some((t) => t.id === saved)) {
        currentId.value = saved;
      } else if (!currentId.value && templates.value.length) {
        currentId.value = templates.value[0].id;
      }
      if (currentId.value) await loadProfile(currentId.value);
    } catch (e) {
      error.value = String(e);
    }
  }

  async function loadProfile(id: string) {
    try {
      currentProfile.value = await invoke<SmartDocProfile>("smart_doc_get_profile", { id });
    } catch (e) {
      currentProfile.value = null;
      error.value = String(e);
    }
  }

  async function selectTemplate(id: string) {
    currentId.value = id;
    generatedSections.value = null;
    await saveCurrentTemplateId(id);
    await loadProfile(id);
  }

  async function learnTemplate() {
    const path = await open({ multiple: false, filters: DOCX_FILTERS });
    if (typeof path !== "string") return;
    loading.value = true;
    error.value = null;
    try {
      appendLog(`正在学习模板: ${fileBasename(path)}`);
      const meta = await invoke<TemplateMeta>("smart_doc_learn_template", { docxPath: path });
      appendLog(`学习完成: ${meta.name}（${meta.section_count} 章节）`);
      await refreshTemplates();
      await selectTemplate(meta.id);
    } catch (e) {
      error.value = String(e);
      appendLog(`学习失败: ${String(e)}`);
    } finally {
      loading.value = false;
    }
  }

  async function renameTemplate(id: string, name: string) {
    await invoke("smart_doc_rename_template", { id, name });
    await refreshTemplates();
  }

  async function deleteTemplate(id: string) {
    await invoke("smart_doc_delete_template", { id });
    if (currentId.value === id) {
      currentId.value = null;
      currentProfile.value = null;
      await saveCurrentTemplateId(null);
    }
    await refreshTemplates();
  }

  async function pickContentFile() {
    const path = await open({ multiple: false, filters: CONTENT_FILTERS });
    if (typeof path !== "string") return;
    contentPath.value = path;
    appendLog(`已选择内容: ${fileBasename(path)}`);
  }

  async function runLlmGenerate(settings: ProviderSettings) {
    if (!currentProfile.value) {
      error.value = "请先选择模板";
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      appendLog("正在调用模型生成内容…");
      generatedSections.value = await generateSections({
        topic: topic.value,
        hints: hints.value,
        structure: currentProfile.value.structure,
        settings,
      });
      appendLog(`模型已生成 ${Object.keys(generatedSections.value).length} 个章节`);
    } catch (e) {
      error.value = String(e);
      appendLog(`生成失败: ${String(e)}`);
    } finally {
      loading.value = false;
    }
  }

  async function generate() {
    if (!currentId.value) {
      error.value = "请先选择模板";
      return;
    }
    const outputPath = await save({ defaultPath: "生成文档.docx", filters: DOCX_FILTERS });
    if (!outputPath) {
      appendLog("已取消保存");
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const isLlm = contentMode.value === "llm";
      const contentKind = isLlm
        ? "sections"
        : adaptiveInput.value === "text"
          ? "text"
          : contentPath.value?.toLowerCase().match(/\.(md|markdown)$/)
            ? "markdown"
            : "text";
      const result = await invoke<SmartDocFillResult>("smart_doc_generate", {
        id: currentId.value,
        outputPath,
        contentKind,
        contentPath: !isLlm && adaptiveInput.value === "file" ? contentPath.value : null,
        contentText: !isLlm && adaptiveInput.value === "text" ? contentText.value : null,
        sections: isLlm ? generatedSections.value : null,
        reporter: reporter.value.trim() || null,
        reportDate: reportDate.value.trim() || null,
      });
      for (const line of result.logs) appendLog(line);
      lastOutputPath.value = result.results[0]?.output ?? outputPath;
      appendLog(`生成完成: ${lastOutputPath.value}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`错误: ${String(e)}`);
    } finally {
      loading.value = false;
    }
  }

  return {
    templates,
    currentId,
    currentProfile,
    currentTemplate,
    contentMode,
    adaptiveInput,
    contentPath,
    contentText,
    topic,
    hints,
    reporter,
    reportDate,
    generatedSections,
    logs,
    loading,
    error,
    lastOutputPath,
    canGenerate,
    fileBasename,
    refreshTemplates,
    selectTemplate,
    learnTemplate,
    renameTemplate,
    deleteTemplate,
    pickContentFile,
    runLlmGenerate,
    generate,
  };
}
```

- [ ] **Step 2: 编写单元测试**

```ts
import { describe, it, expect, vi } from "vitest";

const { invokeMock, openMock, saveMock, generateSectionsMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  openMock: vi.fn(),
  saveMock: vi.fn(),
  generateSectionsMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: openMock, save: saveMock }));
vi.mock("../lib/smartDocStore", () => ({
  loadCurrentTemplateId: vi.fn().mockResolvedValue(null),
  saveCurrentTemplateId: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../agent/smartDocGenerate", () => ({ generateSections: generateSectionsMock }));

import { useWordSmartDoc } from "./useWordSmartDoc";

describe("useWordSmartDoc", () => {
  it("刷新模板列表并默认选中第一个", async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "smart_doc_list_templates")
        return Promise.resolve([{ id: "t1", name: "模板A", description: "", section_count: 3, has_thumbnail: false }]);
      if (cmd === "smart_doc_get_profile")
        return Promise.resolve({ version: 1, styles: {}, structure: [{ key: "auto_1", title: "前言", level: 1 }], meta_fields: [] });
      return Promise.resolve(undefined);
    });

    const sd = useWordSmartDoc();
    await sd.refreshTemplates();
    expect(sd.templates.value.length).toBe(1);
    expect(sd.currentId.value).toBe("t1");
    expect(sd.currentProfile.value?.structure[0].title).toBe("前言");
  });

  it("LLM 模式生成 sections 后允许生成并按 sections 调用后端", async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "smart_doc_list_templates")
        return Promise.resolve([{ id: "t1", name: "A", description: "", section_count: 1, has_thumbnail: false }]);
      if (cmd === "smart_doc_get_profile")
        return Promise.resolve({ version: 1, styles: {}, structure: [{ key: "auto_1", title: "前言", level: 1 }], meta_fields: [] });
      if (cmd === "smart_doc_generate")
        return Promise.resolve({ results: [{ input: "(sections)", output: "/tmp/o.docx" }], logs: ["已生成: /tmp/o.docx"] });
      return Promise.resolve(undefined);
    });
    generateSectionsMock.mockResolvedValue({ auto_1: ["正文一段。"] });
    saveMock.mockResolvedValue("/tmp/o.docx");

    const sd = useWordSmartDoc();
    await sd.refreshTemplates();
    sd.contentMode.value = "llm";
    sd.topic.value = "测试主题";
    expect(sd.canGenerate.value).toBe(false);
    await sd.runLlmGenerate({ baseURL: "x", apiKey: "y", model: "m" });
    expect(sd.generatedSections.value).toEqual({ auto_1: ["正文一段。"] });
    expect(sd.canGenerate.value).toBe(true);
    await sd.generate();
    expect(invokeMock).toHaveBeenCalledWith(
      "smart_doc_generate",
      expect.objectContaining({ contentKind: "sections", sections: { auto_1: ["正文一段。"] } }),
    );
    expect(sd.lastOutputPath.value).toBe("/tmp/o.docx");
  });
});
```

- [ ] **Step 3: 运行测试验证失败再通过**

Run: `pnpm vitest run src/composables/useWordSmartDoc.test.ts`
Expected: 2 个用例 PASS。若先红，根据报错修正 composable 后再绿。

- [ ] **Step 4: 提交**

```bash
git add src/composables/useWordSmartDoc.ts src/composables/useWordSmartDoc.test.ts
git commit -m "feat(word-smart-doc): 新增 composable 与单元测试"
```

---

### Task 10: UI 组件 WordSmartDoc.vue

**Files:**
- Create: `src/components/word-smart-doc/WordSmartDoc.vue`

> 复用项目设计令牌（`var(--dp-*)`）与 `AppButton`。三段 Tab：模板库 / 学习新模板 / 生成文档。挂载时 `refreshTemplates()`。LLM 生成需要 ProviderSettings，用 `useProviderSettings()`。

- [ ] **Step 1: 创建组件**

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppButton from "../ui/AppButton.vue";
import { useWordSmartDoc } from "../../composables/useWordSmartDoc";
import { useProviderSettings } from "../../composables/useProviderSettings";

type Pane = "library" | "learn" | "generate";
const pane = ref<Pane>("library");

const sd = useWordSmartDoc();
const provider = useProviderSettings();
const showLogs = ref(true);

onMounted(async () => {
  await provider.loadSettings();
  await sd.refreshTemplates();
});

async function onRename(id: string, current: string) {
  const name = window.prompt("重命名模板", current);
  if (name && name.trim()) await sd.renameTemplate(id, name.trim());
}

async function onDelete(id: string, name: string) {
  if (window.confirm(`确定删除模板「${name}」？此操作不可恢复。`)) {
    await sd.deleteTemplate(id);
  }
}

async function onSelectAndGenerate(id: string) {
  await sd.selectTemplate(id);
  pane.value = "generate";
}
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col gap-4">
    <!-- 顶部分段 -->
    <div class="flex gap-1 p-1 rounded-xl bg-[var(--dp-surface-2,#f1f5f9)] w-fit">
      <button
        v-for="p in (['library', 'learn', 'generate'] as Pane[])"
        :key="p"
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition"
        :class="pane === p ? 'bg-white shadow text-[var(--dp-primary)]' : 'text-[var(--dp-text-muted)]'"
        @click="pane = p"
      >
        {{ p === "library" ? "模板库" : p === "learn" ? "学习新模板" : "生成文档" }}
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">
      <!-- 模板库 -->
      <section v-if="pane === 'library'" class="space-y-4">
        <div v-if="!sd.templates.value.length" class="text-center py-16 text-[var(--dp-text-muted)]">
          <span class="i-lucide-folder-open w-10 h-10 mx-auto block opacity-40" />
          <p class="mt-3">还没有模板，去「学习新模板」上传一份 Word 吧。</p>
          <AppButton class="mt-4" @click="pane = 'learn'">学习新模板</AppButton>
        </div>
        <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="t in sd.templates.value"
            :key="t.id"
            class="rounded-xl border p-4 flex flex-col gap-2 transition"
            :class="sd.currentId.value === t.id ? 'border-[var(--dp-primary)] ring-1 ring-[var(--dp-primary)]' : 'border-[var(--dp-border)]'"
          >
            <div class="flex items-center gap-2">
              <span class="i-lucide-file-text w-5 h-5 text-[var(--dp-primary)]" />
              <span class="font-semibold truncate flex-1">{{ t.name }}</span>
            </div>
            <p class="text-xs text-[var(--dp-text-muted)]">{{ t.section_count }} 个章节</p>
            <div class="flex gap-2 mt-auto pt-2">
              <AppButton size="sm" @click="onSelectAndGenerate(t.id)">使用</AppButton>
              <AppButton size="sm" variant="ghost" @click="onRename(t.id, t.name)">重命名</AppButton>
              <AppButton size="sm" variant="ghost" @click="onDelete(t.id, t.name)">删除</AppButton>
            </div>
          </div>
        </div>
      </section>

      <!-- 学习新模板 -->
      <section v-else-if="pane === 'learn'" class="max-w-xl space-y-4">
        <p class="text-sm text-[var(--dp-text-secondary)]">
          上传一份 Word（.docx），系统会学习其页面设置、标题/正文样式与章节结构，存入模板库。
        </p>
        <AppButton :loading="sd.loading.value" @click="sd.learnTemplate()">
          选择 Word 并学习
        </AppButton>
        <div v-if="sd.currentProfile.value && sd.currentTemplate.value" class="rounded-xl border border-[var(--dp-border)] p-4">
          <p class="font-semibold mb-2">已学习：{{ sd.currentTemplate.value.name }}</p>
          <ul class="text-sm space-y-1">
            <li v-for="s in sd.currentProfile.value.structure" :key="s.key" class="text-[var(--dp-text-secondary)]">
              <span class="text-[var(--dp-text-muted)]">L{{ s.level }}</span> · {{ s.title }}
            </li>
          </ul>
        </div>
      </section>

      <!-- 生成文档 -->
      <section v-else class="space-y-4">
        <div v-if="!sd.currentTemplate.value" class="text-[var(--dp-text-muted)]">
          请先在「模板库」选择一个模板。
        </div>
        <template v-else>
          <div class="rounded-xl border border-[var(--dp-border)] p-3 flex items-center gap-2">
            <span class="i-lucide-file-check w-5 h-5 text-[var(--dp-primary)]" />
            <span class="font-medium">当前模板：{{ sd.currentTemplate.value.name }}</span>
            <span class="text-xs text-[var(--dp-text-muted)]">{{ sd.currentTemplate.value.section_count }} 章节</span>
          </div>

          <div class="flex gap-1 p-1 rounded-lg bg-[var(--dp-surface-2,#f1f5f9)] w-fit">
            <button
              class="px-3 py-1 rounded text-sm"
              :class="sd.contentMode.value === 'adaptive' ? 'bg-white shadow text-[var(--dp-primary)]' : 'text-[var(--dp-text-muted)]'"
              @click="sd.contentMode.value = 'adaptive'"
            >现成内容</button>
            <button
              class="px-3 py-1 rounded text-sm"
              :class="sd.contentMode.value === 'llm' ? 'bg-white shadow text-[var(--dp-primary)]' : 'text-[var(--dp-text-muted)]'"
              @click="sd.contentMode.value = 'llm'"
            >LLM 生成</button>
          </div>

          <!-- 现成内容 -->
          <div v-if="sd.contentMode.value === 'adaptive'" class="space-y-3">
            <div class="flex gap-2 text-sm">
              <label class="flex items-center gap-1">
                <input type="radio" value="text" v-model="sd.adaptiveInput.value" /> 粘贴文本
              </label>
              <label class="flex items-center gap-1">
                <input type="radio" value="file" v-model="sd.adaptiveInput.value" /> 上传文件
              </label>
            </div>
            <textarea
              v-if="sd.adaptiveInput.value === 'text'"
              v-model="sd.contentText.value"
              rows="8"
              class="w-full rounded-lg border border-[var(--dp-border)] p-3 text-sm"
              placeholder="粘贴 Markdown / 纯文本内容，用 # 标题对应章节…"
            />
            <div v-else class="flex items-center gap-2">
              <AppButton variant="ghost" @click="sd.pickContentFile()">选择内容文件</AppButton>
              <span class="text-sm text-[var(--dp-text-muted)] truncate">
                {{ sd.contentPath.value ? sd.fileBasename(sd.contentPath.value) : "未选择（docx/txt/md）" }}
              </span>
            </div>
          </div>

          <!-- LLM 生成 -->
          <div v-else class="space-y-3">
            <input
              v-model="sd.topic.value"
              class="w-full rounded-lg border border-[var(--dp-border)] p-2.5 text-sm"
              placeholder="文档主题，例如：2025 年度个人工作总结"
            />
            <textarea
              v-model="sd.hints.value"
              rows="4"
              class="w-full rounded-lg border border-[var(--dp-border)] p-3 text-sm"
              placeholder="要点提示（可选）：列出希望覆盖的关键事项…"
            />
            <AppButton :loading="sd.loading.value" @click="sd.runLlmGenerate(provider.settings.value)">
              用模型生成内容
            </AppButton>
            <div v-if="sd.generatedSections.value" class="rounded-xl border border-[var(--dp-border)] p-3 space-y-2 text-sm max-h-64 overflow-y-auto">
              <div v-for="(paras, key) in sd.generatedSections.value" :key="key">
                <p class="font-semibold text-[var(--dp-primary)]">{{ key }}</p>
                <p v-for="(p, i) in paras" :key="i" class="text-[var(--dp-text-secondary)]">{{ p }}</p>
              </div>
            </div>
          </div>

          <!-- 元字段 -->
          <div class="flex gap-3">
            <input v-model="sd.reporter.value" class="flex-1 rounded-lg border border-[var(--dp-border)] p-2 text-sm" placeholder="汇报人（可选）" />
            <input v-model="sd.reportDate.value" class="flex-1 rounded-lg border border-[var(--dp-border)] p-2 text-sm" placeholder="日期（可选）" />
          </div>

          <AppButton :loading="sd.loading.value" :disabled="!sd.canGenerate.value" @click="sd.generate()">
            生成 Word
          </AppButton>
        </template>
      </section>
    </div>

    <!-- 错误与日志 -->
    <p v-if="sd.error.value" class="text-sm text-red-600">{{ sd.error.value }}</p>
    <div v-if="sd.logs.value.length" class="rounded-xl border border-[var(--dp-border)]">
      <button class="w-full px-4 py-2 flex items-center justify-between text-sm font-medium" @click="showLogs = !showLogs">
        <span>运行日志（{{ sd.logs.value.length }}）</span>
        <span :class="showLogs ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-4 h-4" />
      </button>
      <pre v-if="showLogs" class="px-4 pb-3 text-xs text-[var(--dp-text-muted)] whitespace-pre-wrap max-h-40 overflow-y-auto">{{ sd.logs.value.join("\n") }}</pre>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 校验 AppButton 的 props（size/variant/loading/disabled）**

Run: 用 Read 工具查看 `src/components/ui/AppButton.vue` 的 `defineProps`。
Expected: 确认 `size`、`variant`、`loading`、`disabled` 这些 prop 存在；若命名不同（如无 `size`），按实际 props 调整模板中的用法（去掉不支持的 prop）。这是必做的对齐步骤，避免运行时 prop 警告。

- [ ] **Step 3: 类型检查**

Run: `pnpm run check`
Expected: 无类型错误。

- [ ] **Step 4: 提交**

```bash
git add src/components/word-smart-doc/WordSmartDoc.vue
git commit -m "feat(word-smart-doc): 新增主 UI（模板库/学习/生成 三段）"
```

---

### Task 11: App.vue 接入导航 + FEATURE.md

**Files:**
- Modify: `src/App.vue`（import、Tab 类型、tabMeta、nav、挂载）
- Create: `src/components/word-smart-doc/FEATURE.md`

- [ ] **Step 1: import 组件**

在 `src/App.vue` 第 7 行 `import WordTemplateFill ...` 后新增：

```ts
import WordSmartDoc from "./components/word-smart-doc/WordSmartDoc.vue";
```

- [ ] **Step 2: 扩展 Tab 类型与 full-width 判断**

把第 11 行 Tab 类型改为：

```ts
type Tab = "agent" | "tools" | "word-typeset" | "word-template" | "word-smart-doc" | "settings";
```

把 `isFullWidthTab`（第 14-16 行）改为：

```ts
const isFullWidthTab = computed(
  () =>
    tab.value === "agent" ||
    tab.value === "word-typeset" ||
    tab.value === "word-template" ||
    tab.value === "word-smart-doc",
);
```

- [ ] **Step 3: tabMeta 增加分支**

在 `tabMeta` 的 `switch` 中，`case "word-template":` 分支之后新增：

```ts
    case "word-smart-doc":
      return { title: "Word 智能文档", desc: "学习模板 → 模板库 → 自适应排版 / LLM 生成 → 产出 Word" };
```

- [ ] **Step 4: 导航项**

在 `src/App.vue` 的 `<AppNavItem ... label="Word 模板生成" ...>` 整个块（第 93-101 行）之后新增：

```vue
        <AppNavItem
          :active="tab === 'word-smart-doc'"
          label="Word 智能文档"
          @click="tab = 'word-smart-doc'"
        >
          <template #icon>
            <span class="i-lucide-sparkles w-5 h-5" />
          </template>
        </AppNavItem>
```

- [ ] **Step 5: 挂载组件**

在 `<WordTemplateFill v-else-if="tab === 'word-template'" />`（第 162 行）之后新增：

```vue
              <WordSmartDoc v-else-if="tab === 'word-smart-doc'" />
```

- [ ] **Step 6: 创建 FEATURE.md**

```markdown
# Word 智能文档（模板库）

## 现状 (Status)

全新独立模块（`WordSmartDoc.vue` + `useWordSmartDoc()`）：学习任意 docx 提取骨架+样式 profile+章节结构存入模板库（app data `smart-doc-library/<id>/`），三段 Tab（模板库 / 学习新模板 / 生成文档）。生成支持两条路径：现成内容自适应排版、LLM 按章节结构生成内容；产出与模板版式一致的 docx。缩略图用 LibreOffice headless 渲染，缺失时降级。

后端：`scripts/word-smart-doc-learn.py`（学习）、`scripts/word-smart-doc-fill.py`（灌入），经 `word_smart_doc_util.rs` 调用；Tauri 命令 `smart_doc_learn_template` / `smart_doc_list_templates` / `smart_doc_rename_template` / `smart_doc_delete_template` / `smart_doc_get_profile` / `smart_doc_update_profile` / `smart_doc_generate`。LLM 走 `src/agent/smartDocGenerate.ts`（Vercel AI SDK）。

依赖：`pnpm run word-smart-doc:install`（python-docx + LibreOffice 检测）。测试：`word-smart-doc:learn-test` / `word-smart-doc:adaptive-test`。

完全新写，不复用、不改动现有 `word-template-fill` / `word-typeset`。

## 设计意图 (Intent)

把任意 Word 的格式与结构沉淀为可复用模板库，再用现成内容或 LLM 生成内容自适应排版，闭环产出 docx。

## 接口契约 (Interface)

- 前端：`useWordSmartDoc()` — 模板列表、当前模板/profile、学习/生成/列出/删除/重命名、LLM 生成
- Tauri：见上 7 个命令
- Python CLI：`word-smart-doc-learn.py '<json>'`（{docx_path,dest_dir}）；`word-smart-doc-fill.py '<json>'`（{template_dir,output_path,content_kind,...}）

## 变更日志 (Changelog)

- 2026-06-06: 初始实现学习引擎、排版灌入、模板库管理、双内容路径与 UI。

## 待办 / 风险 (TODO / Risks)

- LibreOffice 体积大，发布包是否内置待定；缺失降级文本占位。
- 章节模糊匹配在结构差异大的模板上可能误匹配，已有「按顺序续写文末」兜底。
- profile UI 微调当前仅展示结构，编辑写回 `smart_doc_update_profile` 待补全表单。
```

- [ ] **Step 7: 类型检查与前端测试**

Run: `pnpm run check && pnpm vitest run src/composables/useWordSmartDoc.test.ts`
Expected: 类型通过，测试 2 个用例 PASS。

- [ ] **Step 8: 提交**

```bash
git add src/App.vue src/components/word-smart-doc/FEATURE.md
git commit -m "feat(word-smart-doc): 接入主导航并补充 FEATURE.md"
```

---

### Task 12: 全量验证与运行项目

**Files:**（无新增，验证类）

- [ ] **Step 1: Rust 测试与编译**

Run: `cd src-tauri && cargo test`
Expected: 全部通过（含现有 `build_registry_ids_match_manifest`，因为本模块未新增 ToolRegistry 工具，工具数仍为 26，无需改 tool-ids.json）。

- [ ] **Step 2: 本地 CI**

Run: `pnpm run ci:local`
Expected: lint / 类型 / 前端测试 / 相关检查全部通过。若 CI 包含 Python/脚本检查，确保新脚本符合规范。

- [ ] **Step 3: Python 端到端测试**

Run: `pnpm run word-smart-doc:make-fixtures && pnpm run word-smart-doc:learn-test && pnpm run word-smart-doc:adaptive-test`
Expected: 三步均通过。

- [ ] **Step 4: 重启开发环境（项目约定必做）**

Run:
```bash
lsof -ti:4729 | xargs kill -9 2>/dev/null; pkill -f "tauri dev" 2>/dev/null; cd /Users/nic/NicProjects/DocPilot && npx tauri dev
```
Expected: 前端 http://localhost:4729/ 可访问；桌面 `docpilot` 窗口打开；侧边栏出现「Word 智能文档」。

- [ ] **Step 5: 手动冒烟（桌面端）**

操作：进入「Word 智能文档」→「学习新模板」上传 `scripts/word-smart-doc-test-data/year-end-template.docx` → 模板库出现条目 →「生成文档」粘贴一段带 `#` 标题的内容 →「生成 Word」→ 保存并打开，确认章节内容、字体、汇报人/日期正确。再试 LLM 路径（需已配置 .env 模型）。

- [ ] **Step 6: 最终提交（如有手动修正）**

```bash
git add -A
git commit -m "chore(word-smart-doc): 全量验证与冒烟修正"
```

---

## Self-Review

**1. Spec 覆盖核对：**
- 学习 docx 提取骨架+profile+缩略图 → Task 3 ✓
- 模板库存储（app data `smart-doc-library/<id>/`）→ Task 6（目录管理）+ Task 7（app data 解析）✓
- 模板库 UI（列表/选择/重命名/删除）→ Task 10 ✓
- 自适应排版（现成内容）→ Task 4（fill）+ Task 9/10 ✓
- LLM 生成（主题→章节内容）→ Task 8（generator）+ Task 9/10 ✓
- 缩略图 LibreOffice + 降级 → Task 1 + Task 3 ✓
- profile 微调 → Task 7 提供 `smart_doc_update_profile`；UI 编辑表单标注为待办（FEATURE TODO），结构展示已实现 ✓（注：spec 列其为能力，计划提供后端能力+展示，编辑表单作为后续增量，已在 FEATURE TODO 注明）
- 完全新写、不碰旧代码 → 所有文件为 Create，仅 mod.rs/commands.rs/lib.rs/App.vue/package.json 做新增式 Modify，不改旧逻辑 ✓
- 测试方案 → Task 5（learn/adaptive）+ Task 9（composable 单测）✓

**2. 占位符扫描：** 无 TBD/TODO 式占位；profile 编辑表单作为明确的后续增量在 FEATURE.md TODO 标注，非计划占位。

**3. 类型一致性：** Rust `TemplateMeta`/`FillResult`/`FillItem` 与前端 `TemplateMeta`/`SmartDocFillResult`/`SmartDocFillItem` 字段对齐（id/name/description/section_count/has_thumbnail；results/logs；input/output）。命令名前端 invoke 与 Rust `#[tauri::command]` 一致（smart_doc_*）。Python 输出信封 `{ok,results,logs}` 与 Rust `run_python` 解析一致；学习输出 `{ok,profile,meta,thumbnail,logs}` 与 `learn_template` 解析一致。

**4. 歧义核对：** content_kind 取值（text/markdown/sections）在 composable 与 fill.py 中一致；LLM 路径用 `sections` 且 fill.py 优先 sections 分支。

