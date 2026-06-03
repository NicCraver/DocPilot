# Rust 统一工具接口

## 现状 (Status)

已实现 `Tool` trait、`ToolRegistry`、统一类型（`ToolSchema` / `ToolInput` / `ToolOutput` / `ToolError`），共 **23** 个注册工具（PDF 10 + 图片 8 + 文件 4 + 文本 1），含共享 util（`pdf_lopdf_util` / `image_util` / `file_util`）与 `extra/` 批量工具模块。`ToolSchema`/`ToolInput`/`ToolOutput` 经 **ts-rs** 生成至 `packages/shared-types/src/generated/`；工具 id 全集在 `packages/shared-types/tool-ids.json`，Rust 测试与注册表对齐。

## 设计意图 (Intent)

UI 与 Agent 共用同一套工具执行入口；新增工具只需实现 trait 并注册，不改胶水代码。

## 接口契约 (Interface)

- `Tool::id()` / `schema()` / `execute(ToolInput) -> Result<ToolOutput, ToolError>`
- `ToolRegistry::register` / `list` / `run`

## 变更日志 (Changelog)

- 2026-06-04: `ToolSchema`/`ToolInput`/`ToolOutput` 加 ts-rs 导出；契约类型单一来源见 `packages/shared-types`。
- 2026-06-03: 扩展 20 个 Rust 工具并注册；新增 image/printpdf/md5/sha2 依赖；前端工具中心侧栏分类导航 + 20 独立 Vue 页。
- 2026-06-03: 实现 Tool trait 与 ToolRegistry，建立阶段一工具扩展基线。

## 待办 / 风险 (TODO / Risks)

- 多工具并发执行时的进度回调尚未设计。
