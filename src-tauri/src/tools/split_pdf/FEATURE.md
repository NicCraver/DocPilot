# split_pdf

## 现状 (Status)

已实现按页码范围拆分 PDF（1-based，含首尾）。

## 接口契约 (Interface)

- 参数: `{ input_path, output_path, start_page, end_page }`
- 输出: `{ output_path, page_count, start_page, end_page }`

## 变更日志 (Changelog)

- 2026-06-03: 阶段三新增 split_pdf。
