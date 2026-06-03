# 阶段二：Agent 最小可用 实施计划

> **状态：** 已实现（2026-06-03）

**Goal:** 用户用自然语言驱动 Agent 自动调用 `list_tools` 注册的工具（如 `compress_pdf`），流式对话 + 工具调用可视化。

**Architecture:** 前端 Vercel AI SDK（`streamText` + `isStepCount(5)`）；`buildAgentTools` 从 `list_tools` 动态生成 tools；`execute` 内调用 `run_tool`；Provider 通过 `@ai-sdk/openai` 的 `createOpenAI` 配置 baseURL/apiKey；设置持久化到 `tauri-plugin-store`。

**交付标准:** 在「设置」配置 Ollama/OpenAI 兼容 API 后，Agent tab 输入含真实路径的压缩请求，能调用 `compress_pdf` 并展示结果。

## 已实现文件

- `src/agent/` — registry, providers, runner, jsonSchemaToZod + 单测
- `src/composables/useProviderSettings.ts`, `useAgentChat.ts`
- `src/components/agent/`, `src/components/settings/`
- `src/App.vue` — 工具 / Agent / 设置 三 tab
