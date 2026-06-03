# shared-types：前后端契约单一事实来源 设计

- 日期：2026-06-04
- 状态：已批准（2026-06-04 落地）
- 阶段：阶段四（架构收尾）之一
- 路线：**Rust 为源 + 代码生成（ts-rs）**

## 1. 背景与问题

架构文档 §6 规划了 `packages/shared-types`（前后端共享 schema 单一事实来源，防 schema 漂移），但至今未落地。核对当前三层实现，契约定义**散落三处、各自手写**：

| 契约项                                             | 当前位置                                                                     | 漂移风险                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ToolSchema` / `ToolInput` / `ToolOutput` 信封类型 | Rust `tools/mod.rs` 手写 + 前端 `lib/tools.ts` **手写复刻一遍**              | 字段改名/增删两边可能不同步（如 `requires_confirmation` 命名风格） |
| 工具 `id` 全集                                     | Rust `commands.rs` 注册 23 个 + 前端 `toolCatalog.ts` 23 条 + `toolViews.ts` | 三处手动对齐，新增/删工具要改多处且无校验                          |

`ToolError` 经 `run_tool` 已转成 `String` 跨 IPC，不需要共享。每个工具的**参数 JSON Schema** 由 Rust `schema()` 运行时产出、Agent 经 `list_tools()` 动态消费，已是运行时单一来源，**不在本次代码生成范围**（强行静态化反而牺牲动态注册的优势）。

## 2. 目标与非目标

**目标：**

1. `ToolSchema` / `ToolInput` / `ToolOutput` 的 TS 类型由 Rust 自动生成，前端不再手写复刻。
2. 工具 `id` 全集有一处可校验来源，新增/删工具时若三处不一致，测试即失败（防漂移闸门）。
3. 生成流程与现有 `cargo test` / `vp test` / CI 集成，不引入新的常驻构建守护进程。

**非目标：**

- 不静态化每个工具的参数 schema（保留 `list_tools()` 运行时动态注册）。
- 不改 IPC 协议、不改任何工具行为。
- 不引入 `pnpm` 真正的多包发布（`packages/shared-types` 作为 workspace 内部包，仅本仓消费）。

## 3. 方案设计

### 3.1 Rust 侧：ts-rs 派生

`tools/mod.rs` 的信封结构体加 `#[derive(TS)]` 与 `#[ts(export)]`，`serde_json::Value` 字段用 `#[ts(type = "...")]` 映射为 TS 类型：

```rust
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../packages/shared-types/src/generated/")]
pub struct ToolSchema {
    pub id: String,
    pub description: String,
    #[ts(type = "Record<string, unknown>")]
    pub parameters: serde_json::Value,
    pub requires_confirmation: bool,
}
```

- `ToolInput`、`ToolOutput` 同理（`args` / `data` 用 `Record<string, unknown>`）。
- `cargo test` 运行时由 ts-rs 把 `.ts` 写入 `packages/shared-types/src/generated/`。
- `Cargo.toml` 加 `ts-rs = { version = "*", features = ["serde-json-impl"] }`（dev 或常规依赖，见计划取舍）。

### 3.2 包结构

```
packages/shared-types/
├── package.json          # name: @docpilot/shared-types, exports ./src/index.ts
├── src/
│   ├── generated/        # ts-rs 自动生成（含 .gitignore 决策：纳入版本控制以便 CI 校验 diff）
│   │   ├── ToolSchema.ts
│   │   ├── ToolInput.ts
│   │   └── ToolOutput.ts
│   ├── tool-ids.ts       # 手写：TOOL_IDS 常量 + ToolId 联合类型（前端 catalog/views 的来源）
│   └── index.ts          # 统一 re-export
└── FEATURE.md
```

`pnpm-workspace.yaml` 增加 `packages/*`；根 `tsconfig.json` / vite alias 解析 `@docpilot/shared-types`。

### 3.3 前端改造

- `src/lib/tools.ts`：删除手写 interface，改 `import type { ToolSchema, ToolOutput } from "@docpilot/shared-types"`。
- `src/lib/toolCatalog.ts`：`id` 字段类型收紧为 `ToolId`；`TOOL_CATALOG` 的 id 必须取自 `TOOL_IDS`。
- `src/agent/registry.ts`、`toolViews.ts`：消费同一 `ToolId` 类型。

### 3.4 防漂移闸门（核心价值）

- **Rust 侧测试**：`build_registry()` 注册的 id 集合 == `TOOL_IDS`（新增一个工具到 `tool-ids.ts` 即可被生成/校验，或反向）。当前已有 `build_registry_contains_all_tools` 断言数量为 23，扩展为「id 集合一致」。
- **前端侧测试（Vitest）**：`TOOL_CATALOG`、`toolViews` 的 keys == `TOOL_IDS`，缺漏即红。
- **CI**：`cargo test` 后 `git diff --exit-code packages/shared-types/src/generated/` —— 生成物与提交不一致则 CI 失败，强制开发者提交最新绑定。

## 4. 关键取舍

| 取舍点         | 选择                                           | 理由                                                                         |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| 生成物是否入库 | **入库**                                       | CI 用 `git diff` 校验漂移；前端无需先跑 cargo 即可类型检查                   |
| `id` 全集来源  | 手写 `tool-ids.ts` 为 TS 源，Rust/前端双向断言 | id 是字符串字面量联合类型，TS 表达力更强；Rust 仅校验一致                    |
| 参数 schema    | 不静态生成                                     | 保留 `list_tools()` 动态注册，避免牺牲架构核心优势                           |
| ts-rs 依赖位置 | 常规 `[dependencies]`（非 dev）                | `#[ts(export)]` 在 `#[cfg(test)]` 外，放 dependencies 最省心；体积影响可忽略 |

## 5. 风险

1. ts-rs 版本与 serde 行为细节（如字段重命名 `rename_all`）需与现有 serde 序列化对齐——计划首步用一个结构体验证生成结果与 `lib/tools.ts` 现状字段名一致（尤其 `requires_confirmation` 蛇形命名）。
2. pnpm workspace 接入后 `vp check` / vite 解析 alias 可能需配置——计划中单独一步验证类型解析通过。
3. 生成物入库会让 PR 带 diff 噪音——可接受，换来防漂移闸门。
