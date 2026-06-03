# Agent 层（Vercel AI SDK）

## 现状 (Status)

已实现：`list_tools` 动态注册为 AI SDK tools、`streamText` 多步编排、Provider 可配置（store 持久化）、对话 UI + 工具调用卡片、`requires_confirmation` 确认（dialog ask）。

## 设计意图 (Intent)

Agent 跑在前端 TS，工具执行与 UI 共用 `run_tool`；模型通过 OpenAI 兼容 API（含 Ollama）。

## 接口契约 (Interface)

- `buildAgentTools(confirm?)` → `ToolSet`
- `runAgentChat({ messages, tools, settings, onTextDelta, onToolCall })` → 最终文本
- `createChatModel(settings)` → LanguageModel

## 变更日志 (Changelog)

- 2026-06-03: 阶段二最小 Agent（compress_pdf 自然语言调用）。

## 待办 / 风险 (TODO / Risks)

- API Key 存于 plugin-store 文件，非 Keychain；后续可换强安全存储。
- 需用户自行配置可用模型与网络/本地 Ollama。
