# shared-types（前后端契约）

## 现状 (Status)

`@docpilot/shared-types` workspace 包：`ToolSchema` / `ToolInput` / `ToolOutput` 由 Rust `ts-rs` 生成至 `src/generated/`；工具 `id` 全集在 `tool-ids.json`（TS 与 Rust 测试共用）。

## 设计意图 (Intent)

Rust 为 IPC 信封类型单一事实来源；`tool-ids.json` 为工具 id 全集单一事实来源，防 catalog/registry/views 漂移。

## 接口契约 (Interface)

- `src/generated/*.ts` — ts-rs 生成，勿手改
- `tool-ids.json` — 24 个工具 id
- `TOOL_IDS` / `ToolId` — 前端类型与校验

## 变更日志 (Changelog)

- 2026-06-04: 新增 `convert_to_markdown` 至 tool-ids。
- 2026-06-04: 初始落地 ts-rs 生成 + tool-ids 清单。

## 待办 / 风险 (TODO / Risks)

- 改 Rust 信封结构后须 `cargo test` 并提交 `generated/` diff。
