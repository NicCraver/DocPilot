# 扩展 20 个工具 — 设计规格

- 日期：2026-06-03
- 状态：已实现
- 方案：**B** — 每个工具独立 Rust 模块 + 独立 Vue 页

## 1. 目标

在统一 `Tool` trait 上新增 **20** 个工具（总计 **23**，含原有 compress/merge/split），UI 与 Agent 共用 `list_tools` / `run_tool`。

## 2. 工具清单

| 分类 | ID                | 说明             |
| ---- | ----------------- | ---------------- |
| PDF  | `get_pdf_info`    | 页数、大小、版本 |
| PDF  | `rotate_pdf`      | 旋转 90/180/270° |
| PDF  | `extract_pages`   | 按页码列表提取   |
| PDF  | `delete_pages`    | 删除指定页       |
| PDF  | `reorder_pages`   | 重排页序         |
| PDF  | `add_blank_pages` | 插入空白页       |
| PDF  | `duplicate_page`  | 复制指定页       |
| 图片 | `get_image_info`  | 宽高、格式、大小 |
| 图片 | `compress_image`  | JPEG 质量压缩    |
| 图片 | `resize_image`    | 缩放             |
| 图片 | `convert_image`   | 格式互转         |
| 图片 | `crop_image`      | 裁剪             |
| 图片 | `rotate_image`    | 旋转             |
| 图片 | `merge_images`    | 横向/纵向拼接    |
| 图片 | `images_to_pdf`   | 多图合成 PDF     |
| 文件 | `get_file_info`   | 元数据           |
| 文件 | `compute_hash`    | MD5 / SHA256     |
| 文件 | `copy_file`       | 复制             |
| 文件 | `move_file`       | 移动/重命名      |
| 文本 | `text_to_pdf`     | 纯文本转 PDF     |

## 3. 架构

```
src-tauri/src/tools/
  pdf_lopdf_util.rs   # PDF 页级操作
  image_util.rs       # 图片 + printpdf 转 PDF
  file_util.rs        # 文件元数据/哈希/复制/移动
  extra/              # 20 个 Tool 实现（macro 批量）
src/components/tools/
  {tool}/             # 每工具独立 Vue + FEATURE.md
  shared/ToolPanel.vue
  toolViews.ts        # 动态组件映射
  ToolsHome.vue       # 分类侧栏
src/lib/toolCatalog.ts
src/composables/useToolRunner.ts
```

## 4. 关键决策

- **Rust 优先**：不引入 Python sidecar；`images_to_pdf` / `text_to_pdf` 用 `printpdf`。
- **PDF 复杂操作**：`add_blank_pages` / `duplicate_page` 通过 split + merge 组合实现，复用 lopdf 已有能力。
- **UI**：左侧 PDF/图片/文件/文本 四分类可滚动列表；右侧 lazy 加载工具组件。
- **Agent**：零胶水改动，注册即自动发现。

## 5. 交付标准

- [x] 23 工具注册于 `build_registry()`
- [x] 每工具独立 Vue 页 + composable + FEATURE.md
- [x] `cargo test` / `cargo clippy -D warnings` 通过
- [x] `vp test` / `npm run build` 通过

## 6. 待办（后续阶段）

- OCR、PDF 转 Word（Python sidecar）
- 工具执行进度回调
- API Key 强安全存储
