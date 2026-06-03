# 扩展 20 个工具 实施计划

> **状态：** 已完成（2026-06-03）

**Goal:** 在统一 Tool 接口上新增 20 个 Rust 工具，每工具独立 Vue 页，工具中心分类导航，Agent 自动识别。

**Architecture:** 共享 util 层 + `extra/` 宏批量 Tool + `toolCatalog`/`toolViews` 前端注册表。

**Tech Stack:** Rust (lopdf, image 0.24, printpdf, md5, sha2) · Vue 3 · Tauri 2

---

## 已完成任务摘要

### Rust

- [x] `file_util.rs` / `image_util.rs` / 扩展 `pdf_lopdf_util.rs`
- [x] `extra/{pdf,image,file,text}_tools.rs` — 20 个 Tool
- [x] `commands.rs` 注册 23 工具 + 单测

### 前端

- [x] `toolCatalog.ts` — 23 工具元数据
- [x] `useToolRunner.ts` + 20 composables
- [x] 20 独立 Vue 页 + FEATURE.md
- [x] `ToolsHome.vue` 分类侧栏 + `toolViews.ts` 动态组件

### 验证

- [x] `cargo test` — 11 passed
- [x] `cargo clippy -D warnings`
- [x] `vp test` — 9 passed
- [x] `npm run build`

### 文档

- [x] `src-tauri/src/tools/FEATURE.md`
- [x] `docs/superpowers/specs/2026-06-03-extend-20-tools-design.md`
