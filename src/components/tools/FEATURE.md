# 工具中心 UI

## 现状 (Status)

工具中心 `ToolsHome` 展示 **23** 个工具，左侧按 PDF / 图片 / 文件 / 文本 四分类可滚动列表，顶部支持**搜索过滤**；右侧动态加载对应 Vue 组件（`toolViews.ts`）。每工具独立目录含页面 + FEATURE.md；共享 `ToolPanel.vue`（基于 `AppCard`）与 `useToolRunner.ts`。

## 设计意图 (Intent)

方案 B：每工具独立页面，便于单独迭代 UI；元数据集中在 `toolCatalog.ts` 避免重复。

## 接口契约 (Interface)

- `src/lib/toolCatalog.ts` — `TOOL_CATALOG` / `TOOL_CATEGORIES`
- `src/components/tools/toolViews.ts` — `Record<toolId, Component>`
- 各工具 composable → `runTool(id, args)`

## 变更日志 (Changelog)

- 2026-06-04: UI 重构——工具搜索、分类标签、设计令牌与 `ToolPanel` 上传区可访问性改进。
- 2026-06-03: 新增 20 工具页与分类侧栏；原有 compress/merge/split 保留。
- 2026-06-03: 阶段三 merge/split 三工具 segmented 导航（已被分类侧栏取代）。

## 待办 / 风险 (TODO / Risks)

- 窄屏下双栏布局可改为抽屉式工具列表。
