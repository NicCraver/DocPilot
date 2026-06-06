#!/usr/bin/env python3
"""Word 智能文档自动化格式校验：学习 profile 与灌入产出 docx 的正文字号/字体对比。"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from docx import Document
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parent.parent
LEARN = ROOT / "scripts" / "word-smart-doc-learn.py"
FILL = ROOT / "scripts" / "word-smart-doc-fill.py"
DATA = ROOT / "scripts" / "word-smart-doc-test-data"

FONT_ALIASES: dict[str, set[str]] = {
    "宋体": {"宋体", "SimSun", "simsun", "Songti SC", "STSong"},
    "仿宋_GB2312": {"仿宋_GB2312", "仿宋", "FangSong", "FangSong_GB2312", "STFangsong"},
    "黑体": {"黑体", "SimHei", "simhei", "Heiti SC", "STHeiti"},
}


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str = ""
    scenario: str = ""


@dataclass
class TestReport:
    checks: list[CheckResult] = field(default_factory=list)

    def add(self, scenario: str, name: str, ok: bool, detail: str = "") -> None:
        self.checks.append(CheckResult(name, ok, detail, scenario))

    @property
    def passed(self) -> bool:
        return all(c.ok for c in self.checks)

    def dump(self) -> dict[str, Any]:
        failed = [c for c in self.checks if not c.ok]
        return {
            "passed": self.passed,
            "total": len(self.checks),
            "failed": [f"{c.scenario}:{c.name}" for c in failed],
            "checks": [
                {"scenario": c.scenario, "name": c.name, "ok": c.ok, "detail": c.detail}
                for c in self.checks
            ],
        }


def python_bin() -> Path:
    py = ROOT / ".venv" / "bin" / "python3"
    return py if py.is_file() else Path(sys.executable)


def font_matches(actual: str | None, expected: str) -> bool:
    act = (actual or "").strip()
    if not act:
        return False
    aliases = FONT_ALIASES.get(expected, {expected})
    return act in aliases or act.lower() in {a.lower() for a in aliases}


def run_east_asia_font(run) -> str | None:
    r_pr = run._element.rPr
    if r_pr is None:
        return run.font.name
    r_fonts = r_pr.find(qn("w:rFonts"))
    if r_fonts is None:
        return run.font.name
    return r_fonts.get(qn("w:eastAsia")) or run.font.name


def effective_run_size_pt(run, para, doc: Document) -> float | None:
    if run.font.size:
        return float(run.font.size.pt)
    if para.style and para.style.font and para.style.font.size:
        return float(para.style.font.size.pt)
    try:
        n = doc.styles["Normal"]
        if n.font.size:
            return float(n.font.size.pt)
    except KeyError:
        pass
    return None


def paragraph_body_format_ok(
    para,
    doc: Document,
    expected_font: str,
    expected_size: float,
    tol: float = 0.6,
) -> tuple[bool, str]:
    if not para.runs:
        return False, "段落无 runs"
    sizes: list[float] = []
    fonts: list[str] = []
    for r in para.runs:
        sz = effective_run_size_pt(r, para, doc)
        if sz is not None:
            sizes.append(sz)
        fonts.append(run_east_asia_font(r) or "")
    if not sizes:
        return False, "无法解析字号"
    avg = sum(sizes) / len(sizes)
    if abs(avg - expected_size) > tol:
        return False, f"字号 {avg:.1f}pt，期望 {expected_size}pt"
    if not all(font_matches(f, expected_font) for f in fonts if f):
        return False, f"字体 {fonts}，期望 {expected_font}"
    return True, f"{expected_font} {avg:.1f}pt"


def run_script(script: Path, payload: dict) -> dict:
    proc = subprocess.run(
        [str(python_bin()), str(script), json.dumps(payload, ensure_ascii=False)],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout or f"脚本失败: {script.name}")
    data = json.loads(proc.stdout.strip())
    if not data.get("ok"):
        raise RuntimeError(data.get("error") or proc.stdout)
    return data


def find_paragraph_containing(doc: Document, needle: str):
    for p in doc.paragraphs:
        if needle in p.text:
            return p
    return None


def _assert_body_pipeline(
    report: TestReport,
    scenario: str,
    template: Path,
    content: Path,
    expected_font: str,
    expected_size: float,
    body_needles: list[str],
    expected_style_name: str | None = None,
) -> None:
    with tempfile.TemporaryDirectory(prefix="wsd-style-") as tmp:
        dest = Path(tmp)
        run_script(LEARN, {"docx_path": str(template), "dest_dir": str(dest)})
        profile = json.loads((dest / "profile.json").read_text(encoding="utf-8"))
        body = profile.get("styles", {}).get("body", {})

        report.add(
            scenario,
            "profile.body.size_pt",
            body.get("size_pt") == expected_size,
            f"实际 {body.get('size_pt')}，期望 {expected_size}",
        )
        report.add(
            scenario,
            "profile.body.font_ea",
            font_matches(body.get("font_ea"), expected_font),
            f"实际 {body.get('font_ea')}",
        )
        if expected_style_name:
            report.add(
                scenario,
                "profile.body.style_name",
                body.get("style_name") == expected_style_name,
                f"实际 {body.get('style_name')}",
            )

        out = dest / "out.docx"
        run_script(
            FILL,
            {
                "template_dir": str(dest),
                "output_path": str(out),
                "content_kind": "markdown",
                "content_path": str(content),
            },
        )
        if not out.is_file():
            report.add(scenario, "输出文件", False, str(out))
            return

        doc = Document(str(out))
        for needle in body_needles:
            para = find_paragraph_containing(doc, needle)
            if para is None:
                report.add(scenario, f"正文段「{needle[:12]}…」", False, "未找到")
                continue
            ok, detail = paragraph_body_format_ok(para, doc, expected_font, expected_size)
            report.add(scenario, f"正文段「{needle[:12]}…」", ok, detail)
            if expected_style_name:
                report.add(
                    scenario,
                    f"段落样式「{needle[:8]}…」",
                    para.style.name == expected_style_name,
                    f"实际 {para.style.name}",
                )


def scenario_year_end(report: TestReport) -> None:
    name = "年终模板"
    template = DATA / "year-end-template.docx"
    content = DATA / "year-end-content.md"
    expected_font = "宋体"
    expected_size = 12.0

    _assert_body_pipeline(
        report,
        name,
        template,
        content,
        expected_font,
        expected_size,
        ["今年是公司高速发展", "完成核心系统重构", "项目排期偏紧"],
        expected_style_name="Normal",
    )


def scenario_realistic_body_style(report: TestReport) -> None:
    """Normal=四号、正文样式=小四：必须学到 12pt 而非 14pt。"""
    _assert_body_pipeline(
        report,
        "正文样式模板",
        DATA / "realistic-body-style.docx",
        DATA / "year-end-content.md",
        "宋体",
        12.0,
        ["今年是公司高速发展", "完成核心系统重构"],
        expected_style_name="正文",
    )


def main() -> int:
    report = TestReport()
    scenario_year_end(report)
    scenario_realistic_body_style(report)
    result = report.dump()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not report.passed:
        print("\n未通过项:", file=sys.stderr)
        for c in report.checks:
            if not c.ok:
                print(f"  [{c.scenario}] {c.name}: {c.detail}", file=sys.stderr)
        return 1
    print("\nword-smart-doc 格式校验全部通过。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
