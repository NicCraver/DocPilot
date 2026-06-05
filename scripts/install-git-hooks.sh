#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

chmod +x .githooks/pre-push scripts/ci-local.sh
git config core.hooksPath .githooks

echo "已启用 pre-push 钩子：push 前将自动运行 pnpm run ci:local"
echo "临时跳过：git push --no-verify"
