#!/usr/bin/env python3
"""DocPilot 文档转 Markdown（markitdown + OCR 回退），供打包 sidecar 或开发调试。"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic"}
PDF_EXT = {".pdf"}


def resource_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).resolve().parent


def setup_bundle_env() -> None:
    root = resource_root()
    bin_dir = root / "bin"
    lib_dir = next(
        (p for p in (root / "bin" / "libs", root / "libs", root / "lib") if p.is_dir()),
        None,
    )
    tess = root / "tessdata"
    if bin_dir.is_dir():
        os.environ["PATH"] = f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}"
    if lib_dir:
        if sys.platform == "win32":
            try:
                os.add_dll_directory(str(lib_dir))
            except (AttributeError, OSError):
                pass
            if bin_dir.is_dir():
                try:
                    os.add_dll_directory(str(bin_dir))
                except (AttributeError, OSError):
                    pass
        else:
            old = os.environ.get("DYLD_LIBRARY_PATH", "")
            os.environ["DYLD_LIBRARY_PATH"] = (
                f"{lib_dir}{os.pathsep}{old}" if old else str(lib_dir)
            )
    if tess.is_dir():
        os.environ["TESSDATA_PREFIX"] = str(tess)


def poppler_bin_dir() -> str | None:
    root = resource_root()
    for base in (root / "bin", root):
        if (base / "pdftoppm").is_file() or (base / "pdftoppm.exe").is_file():
            return str(base)
    return None


def tesseract_langs() -> str:
    try:
        import subprocess

        out = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True,
            text=True,
            check=False,
        )
        if "chi_sim" in (out.stdout or ""):
            return "chi_sim+eng"
    except OSError:
        pass
    return "eng"


def ocr_image(path: Path) -> str:
    import pytesseract

    cmd = os.environ.get("TESSERACT_CMD")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    return pytesseract.image_to_string(str(path), lang=tesseract_langs()).strip()


def ocr_pdf(path: Path) -> str:
    from pdf2image import convert_from_path

    poppler = poppler_bin_dir()
    kwargs = {"dpi": 200}
    if poppler:
        kwargs["poppler_path"] = poppler
    pages = convert_from_path(str(path), **kwargs)
    parts: list[str] = []
    for i, img in enumerate(pages):
        import pytesseract

        cmd = os.environ.get("TESSERACT_CMD")
        if cmd:
            pytesseract.pytesseract.tesseract_cmd = cmd
        text = pytesseract.image_to_string(img, lang=tesseract_langs()).strip()
        if len(pages) > 1:
            parts.append(f"## 第 {i + 1} 页\n\n{text}")
        else:
            parts.append(text)
    return "\n\n".join(parts).strip()


def convert_with_markitdown(path: Path, use_plugins: bool) -> str:
    from markitdown import MarkItDown

    md = MarkItDown(enable_plugins=use_plugins)
    result = md.convert(str(path))
    return (result.markdown or result.text_content or "").strip()


def needs_ocr(path: Path, text: str) -> bool:
    if text.strip():
        return False
    ext = path.suffix.lower()
    return ext in PDF_EXT or ext in IMAGE_EXT


def run_convert(input_path: Path, output_path: Path, use_plugins: bool) -> str:
    if not input_path.is_file():
        raise FileNotFoundError(f"路径不存在: {input_path}")

    text = ""
    try:
        text = convert_with_markitdown(input_path, use_plugins)
    except Exception as e:
        print(f"markitdown 警告: {e}", file=sys.stderr)

    used_ocr = False
    if needs_ocr(input_path, text):
        used_ocr = True
        ext = input_path.suffix.lower()
        if ext in PDF_EXT:
            text = ocr_pdf(input_path)
        elif ext in IMAGE_EXT:
            text = ocr_image(input_path)
        else:
            raise RuntimeError("无法从该文件提取内容")

    if not text.strip():
        raise RuntimeError(
            "转换结果为空。若为扫描件，请确认打包内 OCR 组件完整，或安装 tesseract/poppler。"
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text, encoding="utf-8")
    if used_ocr:
        print("docpilot:used_ocr=1", file=sys.stderr)
    return text


def main() -> int:
    setup_bundle_env()
    parser = argparse.ArgumentParser(description="DocPilot 转 Markdown")
    parser.add_argument("input", type=Path)
    parser.add_argument("-o", "--output", type=Path, required=True)
    parser.add_argument("--use-plugins", action="store_true")
    args = parser.parse_args()
    try:
        run_convert(args.input, args.output, args.use_plugins)
        return 0
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
