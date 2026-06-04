#!/usr/bin/env bash
# 构建 Tauri sidecar：内嵌 markitdown + poppler + tesseract（macOS）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build/sidecar-work"
BINARIES="$ROOT/src-tauri/binaries"
ARCH="$(uname -m)"
case "$ARCH" in
  arm64) TRIPLE="aarch64-apple-darwin" ;;
  x86_64) TRIPLE="x86_64-apple-darwin" ;;
  *)
    echo "不支持的架构: $ARCH"
    exit 1
    ;;
esac
OUT_NAME="docpilot-convert-${TRIPLE}"

echo "==> 构建 DocPilot 转换 sidecar (${OUT_NAME})"

command -v brew >/dev/null 2>&1 || {
  echo "需要 Homebrew 以安装 poppler、tesseract、dylibbundler"
  exit 1
}

export HOMEBREW_NO_AUTO_UPDATE=1
brew list poppler >/dev/null 2>&1 || brew install poppler
brew list tesseract >/dev/null 2>&1 || brew install tesseract
brew list dylibbundler >/dev/null 2>&1 || brew install dylibbundler

PY=""
for c in python3.12 python3.11 python3; do
  if command -v "$c" >/dev/null 2>&1; then
    ver="$("$c" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    major="${ver%%.*}"
    minor="${ver#*.}"
    if [ "$major" = "3" ] && [ "$minor" -ge 10 ] && [ "$minor" -le 12 ]; then
      PY="$c"
      break
    fi
  fi
done
[ -n "$PY" ] || {
  echo "需要 Python 3.10–3.12"
  exit 1
}

rm -rf "$BUILD"
mkdir -p "$BUILD/runtime/bin/libs" "$BUILD/runtime/tessdata" "$BINARIES"

echo "==> Python venv + 依赖"
"$PY" -m venv "$BUILD/venv"
# shellcheck disable=SC1091
source "$BUILD/venv/bin/activate"
pip install -U pip
pip install -r "$ROOT/scripts/markitdown-sidecar-requirements.txt"

echo "==> 打包 poppler / tesseract 二进制"
cp "$(command -v pdftoppm)" "$BUILD/runtime/bin/"
cp "$(command -v tesseract)" "$BUILD/runtime/bin/"
cp -R "$(brew --prefix tesseract)/share/tessdata/." "$BUILD/runtime/tessdata/"

POPPLER_LIB="$(brew --prefix poppler)/lib"
TESS_LIB="$(brew --prefix tesseract)/lib"
HB_LIB="$(brew --prefix)/lib"

bundle_binary() {
  local name="$1"
  (
    cd "$BUILD/runtime/bin"
    dylibbundler --overwrite-files --bundle-deps \
      --fix-file "./$name" --dest-dir "./libs" --create-dir \
      --search-path "$POPPLER_LIB" \
      --search-path "$TESS_LIB" \
      --search-path "$HB_LIB"
  )
}

bundle_binary pdftoppm
bundle_binary tesseract

echo "==> PyInstaller"
pyinstaller --noconfirm --clean --onefile \
  --name docpilot-convert \
  --distpath "$BUILD/dist" \
  --workpath "$BUILD/pyinstaller-work" \
  --specpath "$BUILD" \
  --add-data "$BUILD/runtime/tessdata:tessdata" \
  --add-data "$BUILD/runtime/bin:bin" \
  --collect-data magika \
  --hidden-import markitdown \
  --hidden-import pdf2image \
  --hidden-import pytesseract \
  --hidden-import PIL \
  "$ROOT/scripts/docpilot_convert.py"

install -m 755 "$BUILD/dist/docpilot-convert" "$BINARIES/$OUT_NAME"
echo "已生成: $BINARIES/$OUT_NAME"
ls -lh "$BINARIES/$OUT_NAME"
