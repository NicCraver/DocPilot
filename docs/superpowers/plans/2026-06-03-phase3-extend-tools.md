# 阶段三：扩展工具 实施计划

> **状态：** 已实现（2026-06-03）

**Goal:** 在统一 Tool 接口上扩展 Rust 工具，完善工具中心 UI，验证 Windows 打包 CI。

**交付：**

- `merge_pdf`、`split_pdf`（lopdf）
- 工具中心 `ToolsHome` 子导航
- Agent 自动识别新工具（`jsonSchemaToZod` 支持 array）
- GitHub Actions `windows-build` 任务
- OCR / PDF转Word（Python sidecar）、移动端：记入路线图待办，本阶段不实现
