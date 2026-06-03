# DocPilot

跨平台「文件工具集 + AI 智能体」桌面应用（阶段一～三 MVP 已完成）。

## 技术栈

- 前端：Vue 3 + TypeScript + **Vite+**（`vp`）+ UnoCSS + VueUse
- 客户端：Tauri 2
- 工具核心：Rust（`lopdf` 无损结构压缩）
- Agent（阶段二）：Vercel AI SDK

## 开发环境

1. 安装 [Rust](https://rustup.rs/) 与 [Node.js](https://nodejs.org/)（推荐 22+）
2. 安装 Vite+ CLI：`npm i -g @vitejs/plus`
3. 安装依赖：`pnpm install`

## 常用命令

```bash
# 仅前端
vp dev

# Tauri 开发（前端 + Rust）
npx tauri dev

# 测试
vp test
cargo test --manifest-path src-tauri/Cargo.toml

# 代码检查
vp check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# mac 安装包
npx tauri build
```

产物位于 `src-tauri/target/release/bundle/`（`.app` / `.dmg`）。

## 架构文档

- [整体架构设计](docs/superpowers/specs/2026-06-03-docpilot-architecture-design.md)
- [阶段一实施计划](docs/superpowers/plans/2026-06-03-phase1-desktop-pdf-compress.md)

## FEATURE.md 约定

每个功能目录维护 `FEATURE.md`，修改前先读、改后立即更新「现状」与「变更日志」。详见 `.cursor/rules/feature-md.mdc`。

## 阶段路线图

1. **工具**：PDF 压缩、合并、拆分（Rust / lopdf）+ 统一 `list_tools` / `run_tool`
2. **Agent**：自然语言调用全部已注册工具（设置页配置 OpenAI 兼容 API / Ollama）
3. **CI**：macOS Rust 测试 + Ubuntu 前端 + Windows `tauri build`
4. **待办**：图片处理、OCR、PDF 转 Word（Python sidecar）、移动端
