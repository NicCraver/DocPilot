# Agent UI 三套布局

## 现状 (Status)

- **经典编排** (`AgentMessageClassic.vue`)：折叠「执行过程」时间线 + 独立「任务结果」Markdown 区；右侧 `AgentLogPanel`。
- **Claude 流式** (`AgentMessageStream.vue`)：参考 [claude-agent-ui](https://github.com/mrgeoffrich/claude-agent-ui) — 顶部实时状态条（`正在调用 …`）、工具步骤卡片交错、输出与工具同气泡；无右侧日志栏。
- **编排检视器** (`AgentMessageInspector.vue` + `AgentOrchestrationPanel.vue`)：参考 [AgentGUI](https://github.com/AnEntrypoint/agentgui) / CopilotKit Inspector — 对话区仅展示流式/最终文本；右侧垂直管道编号步骤 + 合并事件日志。

三种布局通过 `App.vue` 三个侧边栏菜单切换，会话由 `agentChatSession.ts` 单例共享。

## 设计意图 (Intent)

便于对比业界 Agent 界面的工具调用、输出与编排呈现方式，而不改动底层 `runAgentChat` / `activities` 数据模型。

## 接口契约 (Interface)

- `AgentChat` prop：`layout: 'classic' | 'stream' | 'inspector'`
- 布局子组件 props：`msg`, `msgIndex`, `messageCount`, `loading`

## 变更日志 (Changelog)

- 2026-06-05: Craft Demo 活动步骤图标换用更语义化的 Lucide 字形（sparkles / text-search / book-open-text 等），并按步骤类型使用彩色软底徽章替代灰边框方框。
- 2026-06-05: 新增三套 Agent UI 布局与侧边栏三个菜单；共享 `agentChatSession` 会话状态。

## 待办 / 风险 (TODO / Risks)

- Stream 模式未接 partial tool input 流（依赖 SDK 增量事件）；当前为步骤级更新。
- 可为 Stream 模式增加可选窄日志条。
