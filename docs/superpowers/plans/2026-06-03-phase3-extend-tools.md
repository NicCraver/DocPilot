# 阶段三：扩展工具 实施计划

> **状态：** 已完成（2026-06-03）；**shared-types 契约层** 已于 2026-06-04 落地（见 [设计](../specs/2026-06-04-shared-types-design.md)）。

**Goal:** 在统一 Tool 接口上扩展 Rust 工具，完善工具中心 UI，Agent 自动识别全部工具。

**交付：**

- 原有 `merge_pdf`、`split_pdf`
- **新增 20 工具**（PDF 7 + 图片 8 + 文件 4 + 文本 1），共 **23** 个注册工具
- 工具中心 `ToolsHome` 四分类侧栏 + 每工具独立 Vue 页
- Agent 自动识别（`jsonSchemaToZod` 支持 array）
- 详见 [扩展 20 工具设计](../specs/2026-06-03-extend-20-tools-design.md) 与 [实施计划](./2026-06-03-extend-20-tools.md)

**后续待办：** OCR / PDF转Word（Python sidecar）、移动端
