# DocPilot 整体架构设计

- 日期：2026-06-03
- 状态：已批准（待用户最终审阅）
- 类型：全局架构设计（本次唯一交付物）

## 1. 项目概述

DocPilot 是一个跨平台的「文件工具集 + AI 智能体」桌面/移动应用。

两类核心能力：

1. **文件工具集**：PDF 压缩、PDF 转 Word、Word 转 PDF、图片压缩、图片（JPG/PNG/SVG）转 PDF、合并/拆分/整理、OCR 等。每个工具都有独立前端界面。
2. **Agent 智能体**：用户用自然语言描述需求，Agent 自动编排并调用自身实现的工具集来完成任务，并输出结果（类似 Codex / Cursor 的工具调用智能体）。

技术栈：

- 前端：Vue3 + **Vite+**（VoidZero 一体化工具链，内置 Vitest / Oxc lint+format）+ UnoCSS + VueUse。
- 客户端外壳：Tauri 2（目标 macOS、Windows，后续评估移动端 iOS/Android）。
- 工具核心：Rust（一等公民运行时）。
- 重型工具后端：Python sidecar（可选 / 按需，仅 OCR、高保真 PDF 转 Word 等）。
- Agent 编排：Vercel AI SDK（TypeScript，运行在前端层）。

## 2. 关键决策记录（ADR 摘要）

| 编号 | 决策             | 选择                                                        | 理由                                                              |
| ---- | ---------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| D1   | 工具实现语言策略 | **Rust 优先**，Python 仅按需                                | 移动端友好、包体小、避免强制打包 Python 运行时                    |
| D2   | 重型工具运行位置 | **纯本地优先（隐私优先）起步，接口预留远程/云端扩展**       | 离线可用、隐私好、无服务器成本；接口可插拔便于未来接云端          |
| D3   | Agent 运行形态   | **前端 TS 层 + Vercel AI SDK**，模型 provider 可配置        | 与 Vue/Vite 生态贴合、tool calling 成熟、无额外运行时、移动端共用 |
| D4   | 模型 provider    | 云端 + 本地（Ollama/LM Studio 等 OpenAI 兼容端点）均可配置  | SDK 免费开源，仅按 token 付模型费；本地模型可零成本、隐私优先     |
| D5   | 第一步落地范围   | **最小可用**：mac 跑通 PDF 压缩 + 产出 mac 安装包           | 见效快、对齐「先 PDF 压缩再跨平台打包」，不被移动端阻塞           |
| D6   | 测试投入         | **全面测试**：Rust 单测 + TS 单测 + Vue 组件测试 + E2E + CI | 项目会持续扩展工具，需要稳固回归基线                              |
| D7   | 前端构建工具     | **Vite+**（含 Tauri 集成），遇兼容问题当场解决              | 用户明确要求统一工具链                                            |
| D8   | 模块上下文文件   | 每功能模块维护 **FEATURE.md**（上下文 + 日志双用）          | 人和 AI 下次打开都能快速进入状态                                  |

## 3. 分层架构

```
┌─────────────────────────────────────────────────────────┐
│  ① UI 层 (Vue3 + Vite+ + UnoCSS + VueUse)                 │
│     - 工具页面（每个工具一个组件）                          │
│     - Agent 对话界面（自然语言输入 + 流式输出）             │
│     - 设置（模型 provider 配置：baseURL/key/model）        │
└───────────────┬─────────────────────────┬────────────────┘
                │ (调用工具)               │ (Agent 编排)
                ▼                         ▼
┌─────────────────────────────────────────────────────────┐
│  ② Agent 层 (TS, Vercel AI SDK)                           │
│     - 工具注册表（list_tools → SDK tools）                 │
│     - maxSteps 多轮编排 / 流式 / 工具调用可视化            │
│     - provider 可配置 / 危险操作确认 / 错误降级            │
└───────────────┬─────────────────────────────────────────┘
                │ Tauri invoke (IPC)
                ▼
┌─────────────────────────────────────────────────────────┐
│  ③ 工具核心层 (Rust, Tauri command)                       │
│     ToolRegistry：统一 Tool trait                          │
│     - 轻量工具直接 Rust 实现（PDF压缩/合并/图片等）         │
│     - 重型工具 → 调度到 ④（对上层透明）                    │
└───────────────┬─────────────────────────────────────────┘
                │ (仅重型工具，按需)
                ▼
┌─────────────────────────────────────────────────────────┐
│  ④ 重型工具后端 (Python sidecar，可选/按需下载)            │
│     OCR / 高保真 PDF转Word，本地优先，接口预留远程扩展      │
└─────────────────────────────────────────────────────────┘
```

**核心原则**：UI 调工具与 Agent 调工具走**同一套底层 Tool 接口**（③ 层）。区别只是触发者不同（人点按钮 vs LLM 决策），避免重复实现（DRY）。Agent 的每个 tool 的 `execute` 本质就是 `invoke('run_tool', ...)`，与 UI 调用完全相同的后端命令。

## 4. 统一工具接口抽象（架构核心）

### 4.1 Rust 侧统一 Trait

```rust
// 概念示意，非最终代码
#[async_trait]
pub trait Tool {
    fn id(&self) -> &str;                 // "compress_pdf"
    fn schema(&self) -> ToolSchema;       // 参数 JSON Schema（供 Agent 用）
    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError>;
}
```

- `ToolInput` / `ToolOutput`：统一输入输出信封（文件路径、参数、进度、结果元数据如压缩前后大小）。
- `ToolRegistry`：注册所有工具，按 `id` 查找。新增工具 = 实现 Trait + 注册一行，不改其他代码（开闭原则）。
- `ToolError`：统一错误类型，保证前端/Agent 错误反馈一致且可读。
- 工具可带 `requiresConfirmation` 标记，供 Agent 层在执行危险操作前拦截确认。

### 4.2 两个通用 Tauri 命令（而非每工具一个）

```rust
#[tauri::command] async fn list_tools() -> Vec<ToolSchema>   // 给 Agent 自动发现工具
#[tauri::command] async fn run_tool(id, input) -> ToolOutput // 统一执行入口
```

好处：新增工具时前端与 Agent **无需改胶水代码**。Agent 启动时 `list_tools()` 自动注册全部工具；UI 新工具页只需 `run_tool('xxx', ...)`。

### 4.3 重型工具（Python）融入方式

Python 工具在 Rust 侧同样实现 `Tool` Trait，其 `execute` 内部通过 sidecar/IPC 调 Python 进程。对 UI 与 Agent **完全透明**，它们不感知工具是 Rust 还是 Python 实现——这是「执行位置可插拔」的落点（未来换远程云端只改这一层）。

## 5. Agent 层数据流与调用链路

### 5.1 启动时工具自动注册

```
应用启动 → invoke('list_tools')
        → 拿到所有工具 {id, description, jsonSchema}
        → 动态转成 Vercel AI SDK tools：
          tool({
            description,
            parameters: jsonSchemaToZod(schema),
            execute: (args) => invoke('run_tool', { id, input: args })
          })
```

新增任何工具，Agent 自动获得调用能力，零额外代码。

### 5.2 一次对话完整链路

```
用户输入「帮我把这个 PDF 压缩到最小」
   → streamText({ model: 配置provider, messages, tools, maxSteps: N })
   → LLM 决策：调用 compress_pdf { path, level: "max" }
   → SDK 自动 execute → invoke('run_tool', {id:'compress_pdf', input})
   → Rust ToolRegistry 执行 → 返回 {outputPath, beforeSize, afterSize}
   → 结果回灌 LLM → 生成总结「已压缩，8.2MB → 2.1MB」
   → 前端流式渲染：文字 + 工具调用卡片（工具/参数/结果/产物文件）
```

### 5.3 关键设计点

1. **Provider 可配置**：从设置读取 `{ baseURL, apiKey, modelName }`，用 `createOpenAICompatible()` 构造，支持云端与本地 Ollama。API Key 存 Tauri 安全存储，不落前端明文。
2. **安全确认**：带 `requiresConfirmation` 的工具在 `execute` 前弹 UI 确认（Agent 层拦截）。
3. **可观测性**：每次工具调用记录（工具/参数/耗时/结果/错误）展示在对话中，可选写本地日志。
4. **错误降级**：工具失败时 `ToolError` 转结构化消息回灌 LLM，让其解释或换策略，不让对话崩溃。

## 6. 项目目录结构与模块边界

采用 monorepo（前端、Rust、Python、共享契约协同演进）。

```
DocPilot/
├── src/                          # ① 前端 (Vue3 + Vite+)
│   ├── components/
│   │   ├── tools/
│   │   │   └── compress-pdf/     #   工具目录（含 FEATURE.md）
│   │   └── agent/                #   Agent 对话界面
│   ├── composables/              # useTool() / useAgent() / useProvider()
│   ├── agent/                    # ② Agent 层 (TS)
│   │   ├── registry.ts           #   list_tools → SDK tools
│   │   ├── runner.ts             #   streamText 编排 + 确认/降级
│   │   ├── providers.ts          #   provider 可配置
│   │   └── FEATURE.md
│   ├── lib/
│   │   └── tools.ts              #   invoke('run_tool') 统一封装
│   └── ...
│
├── src-tauri/                    # ③ Rust 工具核心层
│   ├── src/
│   │   ├── tools/
│   │   │   ├── mod.rs            #   Tool trait + ToolRegistry
│   │   │   └── compress_pdf/     #   工具目录（mod.rs + FEATURE.md）
│   │   ├── commands.rs           #   list_tools / run_tool
│   │   ├── sidecar.rs            #   Python sidecar 调度（按需）
│   │   └── lib.rs
│   └── tauri.conf.json
│
├── sidecar-python/               # ④ 重型工具（可选/按需），含 FEATURE.md
│   ├── pyproject.toml
│   └── docpilot_sidecar/
│
├── packages/
│   └── shared-types/             # 前后端共享 schema / IPC 契约（单一事实来源）
│
├── tests/
│   └── e2e/                      # Playwright / Tauri WebDriver
│
├── docs/superpowers/specs/       # 设计文档
└── .github/workflows/            # CI
```

**依赖方向（单向，避免环）：**

- `components` → `composables` / `agent` / `lib`
- `agent` → `lib/tools`（不直接碰 UI）
- `lib/tools` → Tauri IPC → `src-tauri/commands`
- `src-tauri/tools/*` → 互不依赖，仅依赖 `Tool` trait 与 `ToolRegistry`
- `shared-types` → 前端与 Rust 契约共同参照，单一事实来源，防 schema 漂移

**第一步（PDF 压缩）仅涉及：** `compress-pdf/CompressPdf.vue`、`lib/tools.ts`、`src-tauri/tools/compress_pdf/mod.rs` + `tools/mod.rs` + `commands.rs`。Agent 层、Python sidecar、其余工具先不碰，但目录骨架先立好，避免后续重构。

## 7. FEATURE.md 约定（强制）

每个功能/工具目录维护一个 `FEATURE.md`，作为「上下文 + 日志」双用文件。

**位置示例：**

```
src/components/tools/compress-pdf/FEATURE.md
src-tauri/src/tools/compress_pdf/FEATURE.md
src/agent/FEATURE.md
sidecar-python/FEATURE.md
```

**统一模板：**

```markdown
# <功能名>

## 现状 (Status)

当前完成度 / 可用程度 / 已知限制

## 设计意图 (Intent)

为什么这样做、关键取舍（非显而易见的决策）

## 接口契约 (Interface)

输入/输出/错误、依赖的其他模块、对外暴露的命令或 schema

## 变更日志 (Changelog)

- YYYY-MM-DD: 做了什么、为什么

## 待办 / 风险 (TODO / Risks)

未完成项、坑、注意事项
```

**工作流约定：**

1. 动手前：先读该模块 `FEATURE.md` 进入状态。
2. 改完后：立即更新「现状」与「变更日志」（同一次提交内）。
3. 新建模块：必须同时创建 `FEATURE.md`。
4. 该约定固化为 Cursor rule（`.cursor/rules/`），在第一步落地时一并建立，使每次 AI 会话自动遵守。

## 8. 分阶段路线图

每个阶段是独立的 spec → plan → 实现循环。

### 阶段一：桌面端地基 + PDF 压缩（最小可用）

- 搭 monorepo + Vite+ + Tauri2 骨架，立好全部目录与 FEATURE.md 约定、固化 Cursor rule。
- 实现 `Tool` trait + `ToolRegistry` + `list_tools` / `run_tool` 两个通用命令。
- 实现 `compress_pdf`（Rust，`lopdf` / `pdfium` 路线）；UI 工具页：选文件 → 选档位 → 压缩 → 显示前后大小。
- mac 上 `tauri dev` 跑通 + 产出 mac 安装包（.dmg/.app）。
- 建立 CI 骨架（Rust 测试 + 前端测试）。
- **交付标准**：mac 能压缩 PDF，有安装包，测试 + CI 绿。

### 阶段二：Agent（最小可用）

- 接 Vercel AI SDK：`list_tools` 自动注册工具；provider 配置界面（含本地 Ollama）。
- 对话界面 + 流式 + 工具调用卡片 + 危险操作确认。
- **交付标准**：自然语言「压缩这个 PDF」，Agent 自动调 `compress_pdf` 并输出结果。

### 阶段三：扩展工具

- 按统一接口逐个加：合并/拆分、图片压缩、图片转 PDF（Rust）；OCR、PDF 转 Word（Python sidecar，按需下载）。
- 验证 Windows 打包，再评估移动端。
- 每个工具新增 = 实现 trait + 注册 + FEATURE.md，前端/Agent 自动获得能力。

## 9. 测试与 CI 策略（全面测试，从阶段一建立）

| 层        | 测试类型                                  | 工具                               |
| --------- | ----------------------------------------- | ---------------------------------- |
| Rust 工具 | 单元测试（输入/输出/错误/边界）           | `cargo test`                       |
| Agent/TS  | 单元测试（schema 转换、编排、确认、降级） | Vitest（mock model + mock invoke） |
| Vue 组件  | 组件测试                                  | Vitest + Vue Test Utils            |
| 全链路    | 端到端                                    | Playwright / Tauri WebDriver       |

- **CI（GitHub Actions）**：PR 触发 → `cargo test` + `cargo clippy` + Vitest + Oxc lint/format 检查（Vite+ 内置）。E2E 在合并前或定时跑。
- **测试随阶段增长**：阶段一建立 Rust + 组件 + CI 基线；阶段二补 Agent 编排测试；阶段三每个新工具自带单测。

## 10. 风险登记

1. **Vite+ 早期阶段**，与 Tauri2 集成可能有坑 → 已定「当场解决」（D7）。
2. **Python sidecar 跨平台分发与按需下载机制较复杂** → 隔离在 ④ 层，阶段三再深入。
3. **移动端（Tauri2 mobile + Rust 交叉编译）不确定性高** → 放到阶段三末尾评估，不阻塞前两阶段。
4. **API Key / 模型 provider 安全** → Key 存 Tauri 安全存储，不落前端明文。

## 11. 本次交付与下一步

- 本次交付物：本架构设计文档（全局）。
- 下一步：为「阶段一（桌面端地基 + PDF 压缩）」单独进入 spec → plan → 实现循环（通过 writing-plans 制定实施计划）。
