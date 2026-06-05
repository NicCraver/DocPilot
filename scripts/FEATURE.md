# scripts
## 现状 (Status)
- `ci-local.sh`：本地 CI，对齐 GitHub `frontend` + `rust` job；前端使用 `vp check src packages` / `vp test`（Vite+，约秒级）。
- `install-git-hooks.sh`：将 `core.hooksPath` 指向 `.githooks`，`pre-push` 自动跑本地 CI。
- `package.json` 脚本：`ci:local`、`hooks:install`。
- GitHub `CI` workflow 已改为仅 `workflow_dispatch` 手动触发，日常 push 不消耗 Actions 额度。

## 设计意图 (Intent)
开发者在本地验证通过后再 push；云端 CI 作为备用/手动复检，Release 仍由 tag 触发。

## 接口契约 (Interface)
```bash
pnpm run ci:local          # 手动跑一遍本地 CI
pnpm run hooks:install     # 一次性安装 pre-push 钩子
git push --no-verify       # 紧急跳过本地 CI
```

## 变更日志 (Changelog)
- 2026-06-05: 新增本地 CI 与 pre-push 钩子；GitHub 自动 CI 改为手动触发。

## 待办 / 风险 (TODO / Risks)
- `windows-build` 无法在 macOS 本地执行，仍需 Windows 环境或手动 dispatch 云端 CI。
