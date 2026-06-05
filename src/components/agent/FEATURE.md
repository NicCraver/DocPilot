# Agent 对话 UI

## 现状 (Status)

- **`AgentCraftDemo.vue`**（`layouts/`）：主 Agent 界面，Craft 三栏布局 + 真实工具编排。
- `AgentChat.vue`：遗留三套对比布局容器，侧边栏入口已移除。
- 会话 `agentChatSession.ts` 单例，Craft 与遗留布局共用。
- `AgentMarkdown.vue`：助理 Markdown 流式渲染。
- `AgentActivityTimeline.vue` + `AgentActivityItem.vue`：经典布局折叠执行过程。
- `layouts/*`：Stream / Inspector 专用消息体与 `AgentOrchestrationPanel`。
- `ToolCallCard.vue`（遗留）/ `AgentLogPanel.vue`：经典布局右侧技术日志。

## 设计意图 (Intent)

对齐 VercelAISDK demo：助理回复以 Markdown 流式呈现；用户消息保持纯文本。代码块在聊天场景用 `<pre>` 轻量渲染。

## 接口契约 (Interface)

- `AgentMarkdown` props：`content: string`，`streaming?: boolean`
- 样式：`src/styles/app.css` 内 `@import 'markstream-vue/index.css' layer(components)`

## 变更日志 (Changelog)

- 2026-06-05: Craft Demo 作为主 Agent UI，接入 `runAgentChat` 与 PDF 工具链；侧边栏简化为「AI 助理」单入口。
- 2026-06-05: 三套 Agent UI（经典 / Claude 流式 / 编排检视器）+ 三个侧边栏菜单；共享会话状态。
- 2026-06-04: 修复全屏/大窗口时聊天区底部留白：`AgentChat` 改用 `h-full` 随主区域 flex 撑满，不再使用 `calc(100vh - 10rem)`。
- 2026-06-04: 「任务结果」在生成阶段即通过 `draftContent` + markstream 流式展示，定稿后写入 `content`。
- 2026-06-04: 助理消息分区：折叠「执行过程」+ 底部「任务结果」；读文件/工具步骤可展开详情。
- 2026-06-04: 接入 markstream-vue，助理气泡 Markdown 流式渲染。

## 待办 / 风险 (TODO / Risks)

- 长对话未做虚拟滚动；消息很多时可接 `MarkstreamVirtualTimeline` 或现有 scroller 适配器。
