# Agent 层（Vercel AI SDK）

## 现状 (Status)

已实现：`list_tools` 动态注册全部 **23** 个 AI SDK tools、streamText 多步编排、Provider 可配置（store 持久化）、对话 UI + 工具调用卡片、`requires_confirmation` 确认（dialog ask）；`jsonSchemaToZod` 支持 array 类型。
对话界面与工具调用卡片已全面美化，包含：

- 拟真 AI 聊天气泡设计，支持用户/助理头像及不同气泡样式。
- 智能空白状态（Empty State），提供一键填写的推荐 prompt 引导卡片。
- 动态呼吸感打字机加载动画（Typing Indicator）。
- 自动滚动到底部（Auto-scroll）的流畅阅读体验。
- 精致的工具调用详情卡片（ToolCallCard），支持执行中、成功、失败状态徽章，格式化 JSON 参数与结果展示。

## 设计意图 (Intent)

Agent 跑在前端 TS，工具执行与 UI 共用 `run_tool`；模型通过 OpenAI 兼容 API（含 Ollama）。

## 接口契约 (Interface)

- `buildAgentTools(confirm?)` → `ToolSet`
- `runAgentChat({ messages, tools, settings, onTextDelta, onToolCall })` → 最终文本
- `createChatModel(settings)` → LanguageModel

## 变更日志 (Changelog)

- 2026-06-03: Agent 自动识别扩展后的 23 个工具（PDF/图片/文件/文本）。
- 2026-06-04: 接入全局设计令牌与共享 UI 组件；聊天区全高布局、可访问性（aria-live/alert）优化。
- 2026-06-03: 全面美化 AI Agent 聊天界面，新增空白引导、打字机动画、自动滚动及高颜值工具调用卡片。
- 2026-06-03: 阶段二最小 Agent（compress_pdf 自然语言调用）。

## 待办 / 风险 (TODO / Risks)

- API Key 存于 plugin-store 文件，非 Keychain；后续可换强安全存储。
- 需用户自行配置可用模型与网络/本地 Ollama。
