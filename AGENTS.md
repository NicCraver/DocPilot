# DocPilot — Agent 协作说明

## 沟通语言

与用户对话一律使用**中文**（代码、命令、路径、专有名词可保留英文）。

## 修改代码后自动重启（必做）

**每次修改项目代码后，Agent 必须自行重启开发环境**，无需等用户提醒，也无需等到「开发完成」才执行。目的是保证 Tauri 桌面端与前端热更新状态一致，并在回复中简要说明已重启或当前运行状态。

### 何时需要重启

| 变更类型 | 是否重启 |
|----------|----------|
| `.vue` / `.ts` / `.css` / Rust / 配置等影响运行的代码 | **是** |
| 仅 `FEATURE.md`、注释、纯文档（不影响构建与运行） | 否 |
| 用户明确说「先别重启」 | 暂缓，完成后再补 |

### 标准步骤

1. 释放端口并结束旧进程（如有）：
   ```bash
   lsof -ti:4729 | xargs kill -9 2>/dev/null
   pkill -f "tauri dev" 2>/dev/null
   ```
2. 在项目根目录后台启动开发环境：
   ```bash
   cd /Users/nic/NicProjects/DocPilot && npx tauri dev
   ```
3. 确认启动成功：
   - 前端：http://localhost:4729/
   - 桌面应用 `docpilot` 窗口已打开

### 执行要求

- **主动执行**：改完代码即重启，不要只写「你可以运行 `tauri dev`」让用户自己做。
- **后台运行**：`tauri dev` 用后台方式启动，避免阻塞后续操作。
- **简要汇报**：在当轮回复末尾说明已重启，或说明跳过重启的原因（如仅改文档）。

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
