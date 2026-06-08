# Agent Craft 布局

## 现状 (Status)

- **`AgentCraftDemo.vue`**：主 Agent UI（`App.vue` → Craft Demo）。三栏 Craft 布局：左侧会话轨、中间 Craft-like TurnCard + ResponseCard + 流式 Markdown、右侧 Activity 检视器。
- **`AgentCraftAgentsOss.vue`**：`App.vue` → craft-agents-oss。四栏 OSS 布局 + `useCraftAgentsOssMock` **14 组**状态 demo（空会话、Thinking、Preparing、Streaming、权限确认、Stopped、Plan、已完成、工具报错、多轮、Flagged、长工具链、Backlog、Cancelled）；左栏 State demos 与空状态卡片可一键跳转。
- 已接入真实 Agent：`useCraftAgentChat` → `agentChatSession` / `runAgentChat` / 26 个 PDF/图片/文件/Word 工具；Ask 模式内联工具确认，Explore/Ask/Execute 控制执行策略。
- `useCraftAgentChat` 派生 turn phase 与 thinking/preparing gap；Stop 通过 AbortController 中断当前轮，Copy 可复制当前 turn 摘要/回复。
- 遗留三套对比布局（`AgentMessageClassic` / `Stream` / `Inspector`）仍保留在代码库，侧边栏已移除。

## 设计意图 (Intent)

便于对比业界 Agent 界面的工具调用、输出与编排呈现方式，而不改动底层 `runAgentChat` / `activities` 数据模型。

## 接口契约 (Interface)

- `AgentChat` prop：`layout: 'classic' | 'stream' | 'inspector'`
- 布局子组件 props：`msg`, `msgIndex`, `messageCount`, `loading`

## 变更日志 (Changelog)

- 2026-06-07: craft-agents-oss 扩展 14 种会话状态 demo 目录（`CRAFT_OSS_DEMO_CATALOG`），Inspector 展示 demo 说明，空会话页提供状态卡片入口。
- 2026-06-07: craft-agents-oss 发送消息后模拟 LLM 循环：Thinking → 工具步骤 pending/running/success → Response 流式输出；支持 Stop 中断。
- 2026-06-07: craft-agents-oss UI 对齐 OSS 原版设计 token（`craft-agents-oss-theme.css`）、四栏 AppShell 布局；tab 全屏沉浸（隐藏 DocPilot 顶栏、零内边距）。
- 2026-06-07: craft-agents-oss tab 改为 Vue 复刻 OSS 四栏 UI + 七组 mock 会话（`useCraftAgentsOssMock.ts`），替代 iframe 嵌入方案。
- 2026-06-07: `App.vue` 核心功能区新增 craft-agents-oss tab；`AgentCraftAgentsOss.vue` iframe 嵌入本机 OSS 开发服务。
- 2026-06-07: 对齐 Craft Agents 前端交互：TurnCard header 单 copy action、活动 rows + thinking/preparing row、ResponseCard 状态、Explore/Ask/Execute composer、真实 Stop 中断。
- 2026-06-05: Composer 底栏左右分组（附件区 | 模型+权限+发送），去除顶部重复模式条，修复文件数角标居中漂浮问题。
- 2026-06-05: 工具确认条结构化展示（摘要 + 可折叠参数）；工具步骤列表默认限显 5 条并支持展开收起；侧边栏保留「Craft Demo」。
- 2026-06-06: Craft Demo 接入真实 Agent（`useCraftAgentChat`）；移除 mock 定时器与种子会话；`App.vue` 仅保留 Craft Demo 单入口（保留 Word 批量排版工具页）。
- 2026-06-05: Craft Demo 活动步骤图标换用更语义化的 Lucide 字形（sparkles / text-search / book-open-text 等），并按步骤类型使用彩色软底徽章替代灰边框方框。
- 2026-06-05: 新增三套 Agent UI 布局与侧边栏三个菜单；共享 `agentChatSession` 会话状态。

## 待办 / 风险 (TODO / Risks)

- Stream 模式未接 partial tool input 流（依赖 SDK 增量事件）；当前为步骤级更新。
- 可为 Stream 模式增加可选窄日志条。
- Branch 暂不显示；需要真实分支/多 session 后端后再恢复入口。
