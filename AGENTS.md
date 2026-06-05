# DocPilot — Agent 协作说明

## 开发完成后的必做项

**每次功能/修复开发完成后，必须重新运行项目**，以便验证 Tauri 桌面端与前端热更新状态一致。

推荐步骤：

1. 释放端口并结束旧进程（如有）：
   ```bash
   lsof -ti:5173 | xargs kill -9 2>/dev/null
   pkill -f "tauri dev" 2>/dev/null
   ```
2. 在项目根目录启动开发环境：
   ```bash
   cd /Users/nic/NicProjects/DocPilot && npx tauri dev
   ```
3. 确认：
   - 前端：http://localhost:5173/
   - 桌面应用 `docpilot` 窗口已打开

Agent 在告知用户「开发完成」前，应自行执行上述重启（或等价操作），并在回复中说明已重新启动。

## 提交前本地 CI（必做）

日常 push **不触发** GitHub 自动 CI；在本地验证通过后再推送：

```bash
pnpm run hooks:install   # 首次克隆后执行一次
pnpm run ci:local        # 手动全量检查（push 时 pre-push 也会自动跑）
git push                 # 本地 CI 通过才会推送
```

紧急跳过：`git push --no-verify`。需要云端复检时在 GitHub Actions 手动运行 **CI** workflow。

## 项目约定（摘要）

- 修改功能模块前阅读该目录 `FEATURE.md`；改完后同次提交更新「现状」与「变更日志」。
- 技术栈：Vue 3 + UnoCSS + Tauri；Agent 层使用 Vercel AI SDK，助理回复用 markstream-vue 流式渲染。
- 文件转 Markdown：开发环境执行 `pnpm run markitdown:install`；**正式发布包**内置 `docpilot-convert` sidecar（`pnpm run build:sidecar` + `tauri.release.conf.json`），用户无需单独安装 Python/OCR。
- 不要未经用户明确要求就 `git commit` / `git push`。
