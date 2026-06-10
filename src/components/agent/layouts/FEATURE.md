# Agent Craft 布局

## 现状 (Status)

- **`AgentCraftDemo.vue`**：主 Agent UI（`App.vue` → Craft Demo）。三栏布局：左侧会话轨、中间 **OSS 消息流**（`CraftOssMessageFlow`）+ 原有 Composer/权限条、右侧 Activity 检视器。
- **`AgentCraftAgentsOss.vue`**：`App.vue` → craft-agents-oss。四栏 OSS 布局 + `useCraftAgentsOssMock` **15 组**状态 demo（含录屏对照 **PDF 压缩**）；处理中保留 composer + Stop、聊天区计时状态（处理中/思考中/烹饪中等）、工具行命令片段与 Error 徽章、计划 Response 复制/接受、排队提示。
- 已接入真实 Agent：`useCraftAgentChat` → `agentChatSession` / `runAgentChat` / 26 个 PDF/图片/文件/Word 工具；Ask 模式内联工具确认，Explore/Ask/Execute 控制执行策略。
- `useCraftAgentChat` 派生 turn phase 与 thinking/preparing gap；Stop 通过 AbortController 中断当前轮，Copy 可复制当前 turn 摘要/回复。
- 遗留三套对比布局（`AgentMessageClassic` / `Stream` / `Inspector`）仍保留在代码库，侧边栏已移除。

## 设计意图 (Intent)

便于对比业界 Agent 界面的工具调用、输出与编排呈现方式，而不改动底层 `runAgentChat` / `activities` 数据模型。

## 接口契约 (Interface)

- `AgentChat` prop：`layout: 'classic' | 'stream' | 'inspector'`
- 布局子组件 props：`msg`, `msgIndex`, `messageCount`, `loading`

## 变更日志 (Changelog)

- 2026-06-10: 修复贴底流式输出抖动：贴底检测 + rAF 合并 + 瞬时 `scrollTop`（取代高频 `smooth` 滚动）；`overflow-anchor` 锚定末条消息。
- 2026-06-10: 修复 Craft Demo 消息区无法滚动：`.craft-oss-app.oss-chat-scroll` 组合选择器 + `craft-message-scroll` 补 `overflow: auto`。
- 2026-06-10: `oss-response-body` 正文字号与 `oss-user-bubble` 对齐（`--dp-text-sm` / `--dp-leading-relaxed`）。
- 2026-06-10: 抽取 `CraftOssMessageFlow.vue` + `craft-agents-oss-messages.css`；Craft Demo 与 craft-agents-oss 共用 OSS 消息流（早期思考态、Turn 底栏计时、命令预览、Response 复制底栏）。
- 2026-06-08: OSS composer 焦点环改为容器 `:focus-within` 整框高亮，修复 textarea 单独 focus 在底栏分界处出现紫色横线；底栏右侧模型名与发送钮间距加大。
- 2026-06-08: OSS 会话列表标题/预览单行省略（`min-width:0` 链路 + 徽章与预览分行收缩），悬停 `title` 显示全文。
- 2026-06-08: craft-agents-oss 思考态去重：尚无工具步骤时仅保留一行内联计时（不渲染 Turn 卡片/thinking 行/footer）；有步骤后才显示 Turn 卡片 + 步骤间 thinking 行 + 底部轮播计时。
- 2026-06-08: craft-agents-oss 对齐录屏交互：composer 上方探索/待办/信息工具条；处理中内联计时 + composer 内 Stop；附件网格卡片；工具步骤命令预览与 Error 徽章；计划接受后排队→执行模拟；新增 PDF 压缩 demo 会话。
- 2026-06-08: 导航/会话选中态统一为中性内凹面板，去除左侧主色高亮条（AppNavItem、Craft 会话轨、OSS 导航与会话列表）。
- 2026-06-08: 全量 UI 品味升级（审计落地）：`--dp-*` 令牌扩展并映射 OSS 主题；去彩虹工具色/重阴影/药丸 Badge；状态文案中文化；补 segmented/textarea/permission/inspector 空态与 focus/disabled；用户气泡主色浅底区分助理卡片。
- 2026-06-08: AgentCraftDemo 视觉对齐新 design tokens：紧凑三栏间距、会话轨左指示选中态、发送钮主色、建议卡片交互态、用户气泡细边框。
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
