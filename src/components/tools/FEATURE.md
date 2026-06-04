# 工具中心 UI

## 现状 (Status)

工具中心 `ToolsHome` 展示 **24** 个工具：左侧为分类筛选芯片（全部 / PDF / 图片 / 文件 / 文本，含数量角标）、搜索框（可一键清除）、带说明副标题的工具列表（左侧主色指示条 + 图标底）；窄屏侧栏限高可滚动，宽屏双栏。右侧工具头使用 `AppBadge` 分类标签，切换工具有 `prefers-reduced-motion` 友好过渡。`compress_pdf` / `merge_pdf` / `split_pdf` 已对齐 `AppCard` / `ToolPanel` 与设计令牌。共享 `ToolPanel.vue` 与 `useToolRunner.ts`；契约见 `@docpilot/shared-types`。

## 设计意图 (Intent)

方案 B：每工具独立页面，便于单独迭代 UI；元数据集中在 `toolCatalog.ts` 避免重复。

## 接口契约 (Interface)

- `src/lib/toolCatalog.ts` — `TOOL_CATALOG` / `TOOL_CATEGORIES`
- `src/components/tools/toolViews.ts` — `Record<toolId, Component>`
- 各工具 composable → `runTool(id, args)`

## 变更日志 (Changelog)

- 2026-06-04: PDF 工具箱 UI 优化——`ToolsHome` 分类筛选、列表层次与空状态；压缩/合并/拆分页统一设计令牌与可访问性。
- 2026-06-04: 修复 `ToolPanel` 未传 `canRun` 时主按钮误禁用（Vue boolean 默认为 false）。
- 2026-06-04: 新增「转 Markdown」工具页（MarkItDown）。
- 2026-06-04: 接入 `@docpilot/shared-types`；`toolCatalog`/`toolViews` id 类型收紧为 `ToolId`，契约测试防漂移。
- 2026-06-04: UI 重构——工具搜索、分类标签、设计令牌与 `ToolPanel` 上传区可访问性改进。
- 2026-06-03: 新增 20 工具页与分类侧栏；原有 compress/merge/split 保留。
- 2026-06-03: 阶段三 merge/split 三工具 segmented 导航（已被分类侧栏取代）。

## 待办 / 风险 (TODO / Risks)

- 极窄屏可考虑抽屉式工具列表（当前为限高横向折叠侧栏）。
