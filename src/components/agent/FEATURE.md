# Agent 对话 UI

## 现状 (Status)

- `AgentChat.vue`：聊天主界面、附件、推荐 prompt、操作日志侧栏。
- `AgentMarkdown.vue`：助理「任务结果」区 Markdown 流式渲染。
- `AgentActivityTimeline.vue` + `AgentActivityItem.vue`：执行过程（读文件、调工具）默认折叠，可展开查看参数/结果。
- `ToolCallCard.vue`（遗留，已由 Activity 时间线替代）/ `AgentLogPanel.vue`：右侧技术日志。

## 设计意图 (Intent)

对齐 VercelAISDK demo：助理回复以 Markdown 流式呈现；用户消息保持纯文本。代码块在聊天场景用 `<pre>` 轻量渲染。

## 接口契约 (Interface)

- `AgentMarkdown` props：`content: string`，`streaming?: boolean`
- 样式：`src/styles/app.css` 内 `@import 'markstream-vue/index.css' layer(components)`

## 变更日志 (Changelog)

- 2026-06-04: 修复全屏/大窗口时聊天区底部留白：`AgentChat` 改用 `h-full` 随主区域 flex 撑满，不再使用 `calc(100vh - 10rem)`。
- 2026-06-04: 「任务结果」在生成阶段即通过 `draftContent` + markstream 流式展示，定稿后写入 `content`。
- 2026-06-04: 助理消息分区：折叠「执行过程」+ 底部「任务结果」；读文件/工具步骤可展开详情。
- 2026-06-04: 接入 markstream-vue，助理气泡 Markdown 流式渲染。

## 待办 / 风险 (TODO / Risks)

- 长对话未做虚拟滚动；消息很多时可接 `MarkstreamVirtualTimeline` 或现有 scroller 适配器。
