# Agent 层（Vercel AI SDK）

## 现状 (Status)

已实现：`list_tools` 动态注册全部 **26** 个 AI SDK tools、streamText 多步编排（`consumeStream` + `stepCountIs(8)`）、**`provider.chat`** 兼容智谱/Ollama、按用户意图筛选工具子集、路径上下文注入 system（对齐 VercelAISDK demo）、Provider 可配置（store 持久化）、对话 UI + 工具调用卡片、`requires_confirmation` 确认（dialog ask）；`jsonSchemaToZod` 支持 array 类型。
**文件附件**：发送前可添加本地文件/文件夹（文件夹一层展开为 pdf/图片路径列表），路径块注入模型消息；工具执行前对缺失/无效的 `input_path` / `input_paths` / `path` / `src` 弹出系统文件选择器。
对话界面与工具调用卡片已全面美化，包含：

- 拟真 AI 聊天气泡设计，支持用户/助理头像及不同气泡样式。
- 智能空白状态（Empty State），提供一键填写的推荐 prompt 引导卡片。
- 动态呼吸感打字机加载动画（Typing Indicator）。
- 自动滚动到底部（Auto-scroll）的流畅阅读体验。
- 精致的工具调用详情卡片（ToolCallCard），支持执行中、成功、失败状态徽章，格式化 JSON 参数与结果展示。
- 助理单轮消息含 `activities[]`（执行过程）与 `content`（最终任务结果）；见 `agent/activities.ts`。
- 助理「任务结果」由 **markstream-vue** 渲染（见 `components/agent/AgentMarkdown.vue`）。
- **右侧操作日志**（`AgentLogPanel`，经典布局）/ **编排检视器**（Inspector 布局合并 activities + 日志）：按时间记录用户发送、模型步骤、工具执行等。
- **Craft Agent UI**：`App.vue`「Craft Demo」→ `AgentCraftDemo`，数据层 `agentChatSession` 单例；`useCraftAgentChat` 将 `activities[]` 派生为 Craft-like turn phase（pending / tool_active / awaiting / streaming / complete）。`buildAgentTools` 支持 `confirmAll`（Ask 模式逐工具确认）与 AbortSignal 检查；Stop 会中断 AI SDK 流、阻止晚到工具事件回灌 UI。`useAgentLog` 同时支持组件内订阅自动清理与会话单例场景，避免组件外调用触发生命周期警告。

## 设计意图 (Intent)

Agent 跑在前端 TS，工具执行与 UI 共用 `run_tool`；模型通过 OpenAI 兼容 API（含 Ollama）。

## 接口契约 (Interface)

- `buildAgentTools(confirm?, onActivity?, confirmAll?)` → `ToolSet`（`ToolSchema` 类型来自 `@docpilot/shared-types`）
- `runAgentChat({ messages, tools, settings, onTextDelta, onToolCall, abortSignal? })` → 最终文本（内部 `selectToolsForUserText` + `buildAttachmentContextHint`）
- `selectToolsForUserText` / `buildAttachmentContextHint` — 意图工具筛选与路径 hint
- `createChatModel(settings)` → LanguageModel
- `formatUserMessageForModel(text, attachments)` / `resolveToolArgs(schema, args)` — 附件与路径补全
- Tauri：`list_files_in_dir`、`path_exists`
- `pushAgentLog` / `subscribeAgentLog` — 全局操作日志事件；`useAgentLog` 订阅并展示

## 变更日志 (Changelog)

- 2026-06-07: Craft UI adapter 增加 turn phase / thinking gap 映射；`agentChatSession.stop()` 通过 AbortController 中断当前轮，工具执行路径增加 abort 检查并忽略 stop 后晚到活动。
- 2026-06-06: Craft UI 接入 Agent；`buildAgentTools` 增加 `confirmAll`；`useCraftAgentChat` 映射 activities → turn card；`App.vue` 侧边栏简化为 Craft Demo 单入口。
- 2026-06-06: 修复 `useAgentLog` 在 `agentChatSession` 单例中组件外调用时触发 Vue `onUnmounted` 警告，并补充回归测试。
- 2026-06-05: 新增 `format_docx_batch` / `format_docx_text` Word 排版工具与意图筛选。
- 2026-06-05: `agentChatSession.ts` 单例会话，供 Agent UI 布局共用。
- 2026-06-04: 集成 `convert_to_markdown`（MarkItDown）；意图筛选与 system prompt 支持转 MD。

- 2026-06-04: 执行过程与任务结果分离；`buildAgentTools` / `resolveToolArgs` 上报 `AgentActivity`。
- 2026-06-04: 助理消息改用 markstream-vue Markdown 流式渲染。
- 2026-06-04: 对齐 VercelAISDK demo：`provider.chat`、强化 system/路径 hint、`consumeStream` 多步编排、按意图筛选工具；修复智谱等兼容 API 空回复。
- 2026-06-04: 大模型配置支持 `.env`（`VITE_LLM_BASE_URL` / `VITE_LLM_API_KEY` / `VITE_LLM_MODEL`）。
- 2026-06-04: Agent 右侧操作日志面板，记录模型步骤与工具执行全链路。
- 2026-06-04: Agent 聊天支持文件/文件夹附件；工具执行前自动补全输入路径。
- 2026-06-04: Agent 消费 `@docpilot/shared-types` 的 `ToolSchema`，与 Rust IPC 信封对齐。
- 2026-06-03: Agent 自动识别扩展后的工具集（PDF/图片/文件/文本）。
- 2026-06-04: 接入全局设计令牌与共享 UI 组件；聊天区全高布局、可访问性（aria-live/alert）优化。
- 2026-06-03: 全面美化 AI Agent 聊天界面，新增空白引导、打字机动画、自动滚动及高颜值工具调用卡片。
- 2026-06-03: 阶段二最小 Agent（compress_pdf 自然语言调用）。

## 待办 / 风险 (TODO / Risks)

- 大模型优先读 `.env`（`VITE_LLM_*`）；未设 `VITE_LLM_MODEL` 时回退 plugin-store。
- API Key 在 .env 或 store 中，非 Keychain；生产环境注意勿提交 `.env`。
- 需用户自行配置可用模型与网络/本地 Ollama。
- 文件夹仅扫描一层；`output_path` 仍由模型生成，未自动弹出保存对话框。
- Stop 可中断模型流和阻止结果继续回灌；已进入 Rust/Tauri 的单个 `run_tool` IPC 仍可能在后台自然完成。
