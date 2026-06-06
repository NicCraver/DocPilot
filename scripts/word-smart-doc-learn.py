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
from docx.oxml.ns import qn
from docx.shared import RGBColor

SOFFICE_CANDIDATES = [
    "soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
]

GUIDE_KEYWORDS = ("填写指南", "请点击", "扫描二维码", "feishu.cn", "格式刷", "使用时")

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
    if any(k in text for k in GUIDE_KEYWORDS):
        return True
    return False


def _ea_font(run) -> str | None:
    r_pr = run._element.rPr
    if r_pr is None:
        return run.font.name
    rfonts = r_pr.find(qn("w:rFonts"))
    if rfonts is None:
        return run.font.name
    ea = rfonts.get(qn("w:eastAsia"))
    return ea or run.font.name


def _para_size_pt(para) -> float | None:
    for r in para.runs:
        if r.font.size:
            return r.font.size.pt
    return None


def _heading_level(para) -> int | None:
    """返回标题层级（1..），非标题返回 None。"""
    name = (para.style.name or "").lower() if para.style else ""
    if name.startswith("subtitle"):
        return None  # 副标题不作为主标题，交由后续启发式（实际会落到正文）
    if name.startswith("title"):
        return 0  # 文档主标题
    m = re.match(r"heading\s*(\d+)", name)
    if m:
        return int(m.group(1))
    text = para.text.strip()
    if not text or len(text) > 40 or paragraph_is_guide(para):
        return None
    bold_len = sum(len(r.text) for r in para.runs if r.bold)
    # 居中且较大字号的短段落视作文档主标题（level 0），优先于序号/加粗启发式，
    # 避免「2025 年终总结报告」这类以数字开头的主标题被误判为二级标题。
    if _align_name(para) == "center" and len(text) <= 30:
        size = _para_size_pt(para)
        if (size and size >= 20) or bold_len:
            return 0
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
    soffice: str | None = None
    for c in SOFFICE_CANDIDATES:
        if c == "soffice":
            found = shutil.which("soffice")
            if found:
                soffice = found
                break
        elif Path(c).exists():
            soffice = c
            break
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
    except json.JSONDecodeError as e:
        print(json.dumps({"ok": False, "error": f"JSON 解析失败: {e}"}, ensure_ascii=False))
        sys.exit(1)

    docx_path = payload.get("docx_path")
    dest_dir = payload.get("dest_dir")
    if not docx_path or not dest_dir:
        print(json.dumps({"ok": False, "error": "docx_path 与 dest_dir 必填"}, ensure_ascii=False))
        sys.exit(1)

    try:
        result = learn(docx_path, dest_dir)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
