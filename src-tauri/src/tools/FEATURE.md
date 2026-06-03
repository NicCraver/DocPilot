# Rust 统一工具接口

## 现状 (Status)

已实现 `Tool` trait、`ToolRegistry`、统一类型（`ToolSchema` / `ToolInput` / `ToolOutput` / `ToolError`），含 3 个注册表单元测试。

## 设计意图 (Intent)

UI 与 Agent 共用同一套工具执行入口；新增工具只需实现 trait 并注册，不改胶水代码。

## 接口契约 (Interface)

- `Tool::id()` / `schema()` / `execute(ToolInput) -> Result<ToolOutput, ToolError>`
- `ToolRegistry::register` / `list` / `run`

## 变更日志 (Changelog)

- 2026-06-03: 实现 Tool trait 与 ToolRegistry，建立阶段一工具扩展基线。

## 待办 / 风险 (TODO / Risks)

- 多工具并发执行时的进度回调尚未设计。
