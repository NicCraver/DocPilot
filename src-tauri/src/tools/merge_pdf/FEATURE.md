# merge_pdf

## 现状 (Status)

已实现多 PDF 合并（lopdf 官方 merge 流程简化版），Agent 与工具页均可调用。

## 接口契约 (Interface)

- 参数: `{ input_paths: string[], output_path: string }`
- 输出: `{ output_path, page_count, file_count }`

## 变更日志 (Changelog)

- 2026-06-03: 阶段三新增 merge_pdf。
