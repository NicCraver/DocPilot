#!/usr/bin/env bash
# 与 .github/workflows/ci.yml 中 frontend + rust job 对齐（Windows 构建仅云端/手动）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "==> $1"; }

step "本地 CI：前端检查（vp check）"
# generated/ 由 ts-rs 生成，不参与 vp 格式化，避免与 cargo test 冲突
vp check src packages/shared-types/src/index.ts packages/shared-types/src/tool-ids.ts

step "本地 CI：前端单元测试（vp test）"
vp test

step "本地 CI：Rust clippy"
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

step "本地 CI：Rust 单元测试"
cargo test --manifest-path src-tauri/Cargo.toml

step "本地 CI：Word 排版格式自动化测试"
pnpm run word-typeset:test

step "本地 CI：校验 ts-rs 生成物已提交"
git diff --exit-code packages/shared-types/src/generated/

echo ""
echo "本地 CI 全部通过，可以 push。"
