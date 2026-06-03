# 实施计划：shared-types 单一事实来源

> **状态：** 已完成（2026-06-04）
> **设计：** [shared-types 设计](../specs/2026-06-04-shared-types-design.md)
> **路线：** Rust 为源 + ts-rs 代码生成

**Goal:** 让 `ToolSchema/ToolInput/ToolOutput` 的 TS 类型由 Rust 自动生成，工具 `id` 全集有可校验单一来源，并加防漂移测试闸门——前端不再手写复刻契约。

每一步都以可运行的验证收尾（绿了才进下一步）。

---

## 步骤 1：ts-rs 生成验证（最小切片，先证可行）

**动机：** 先确认 ts-rs 生成的字段名与现有 `lib/tools.ts` 一致（尤其 `requires_confirmation` 蛇形命名、`serde_json::Value` 映射），避免后面大改才发现漂移。

- `src-tauri/Cargo.toml` 加 `ts-rs = { version = "12", features = ["serde-json-impl"] }`。
- `tools/mod.rs` 给 `ToolSchema` / `ToolInput` / `ToolOutput` 加 `#[derive(ts_rs::TS)]` + `#[ts(export, export_to = "../packages/shared-types/src/generated/")]`，`parameters`/`args`/`data` 加 `#[ts(type = "Record<string, unknown>")]`。

**验证：** `cargo test --manifest-path src-tauri/Cargo.toml` 通过，且生成的 `packages/shared-types/src/generated/ToolSchema.ts` 字段名与现 `lib/tools.ts` 完全一致（`requires_confirmation` 为蛇形）。若不一致，用 ts-rs `#[ts(rename)]` 或 serde 对齐后再继续。

---

## 步骤 2：建立 packages/shared-types 包

- `pnpm-workspace.yaml` 增加 `packages: - 'packages/*'`（保留现有 allowBuilds/onlyBuiltDependencies）。
- 新建 `packages/shared-types/package.json`（name `@docpilot/shared-types`、`exports` 指向 `./src/index.ts`、`"type": "module"`）。
- 新建 `packages/shared-types/src/tool-ids.ts`：`export const TOOL_IDS = [...] as const`（23 个 id）+ `export type ToolId = typeof TOOL_IDS[number]`。
- 新建 `src/index.ts`：re-export `generated/*` 与 `tool-ids`。
- 新建 `packages/shared-types/FEATURE.md`（按模板填现状/意图/接口/日志）。
- 根 `tsconfig.json` 加 `paths` alias；`vite.config.ts` 加 resolve alias 指向包入口。

**验证：** `pnpm install` 成功识别 workspace 包；`vp check` 能解析 `@docpilot/shared-types` 导入（写一行临时 import 验证后删除，或直接进步骤 3）。

---

## 步骤 3：前端切换到生成类型

- `src/lib/tools.ts`：删手写 `ToolSchema`/`ToolOutput` interface，改为从 `@docpilot/shared-types` 导入 type。
- `src/lib/toolCatalog.ts`：`ToolMeta.id` 类型改为 `ToolId`；保持 23 条数据不变。
- `src/agent/registry.ts`、`toolViews.ts`：如有 id 字符串类型处，收紧为 `ToolId`。

**验证：** `vp check` 通过（类型无错）；`vp test` 现有 5 个测试文件全绿。

---

## 步骤 4：防漂移测试闸门

- **Rust** `commands.rs`：把 `build_registry_contains_all_tools` 升级为「注册 id 集合 == 预期 23 个 id 的集合」（排序后逐一断言），不只断言数量。
- **前端** 新增 `src/lib/toolCatalog.test.ts`：断言 `TOOL_CATALOG.map(t=>t.id)` 的集合 == `TOOL_IDS` 集合；断言 `toolViews` 的 keys 集合 == `TOOL_IDS`。

**验证：** 故意删/加一个 id 制造不一致 → 对应测试变红；恢复后 `cargo test` 与 `vp test` 均绿。

---

## 步骤 5：CI 集成生成物校验

- `.github/workflows/ci.yml` 的 `rust` job：`cargo test` 后加一步 `git diff --exit-code packages/shared-types/src/generated/`，生成物与提交不一致即失败。
- 确认 `frontend` job 的 `pnpm install` 能装 workspace 包、`vp check`/`vp test` 覆盖新增测试。

**验证：** 本地模拟——改 Rust 结构体字段但不提交生成物 → `git diff --exit-code` 返回非 0；提交后归零。

---

## 步骤 6：收尾（FEATURE.md + 文档）

- 更新 `src-tauri/src/tools/FEATURE.md`、`src/components/tools/FEATURE.md`、`src/agent/FEATURE.md` 的「现状/变更日志」：契约改为 shared-types 单一来源。
- 架构 spec §11 / 阶段路线补一句「shared-types 已落地」。

**最终验证（全链路）：** `cargo test` + `vp check` + `vp test` 全绿；`git diff --exit-code packages/shared-types/src/generated/` 干净。

---

## 回滚点

每步独立可回滚。步骤 1 若 ts-rs 字段名/版本不兼容且无法用 attribute 对齐，则降级到设计文档「轻量版契约测试」路线（仅 id 集合一致性测试，不引入代码生成），并停下与用户确认。
