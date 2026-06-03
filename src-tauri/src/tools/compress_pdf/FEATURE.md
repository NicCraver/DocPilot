# compress_pdf

## 现状 (Status)

已实现基于 lopdf `save_modern()` 的无损结构压缩（对象流 + 交叉引用流），返回压缩前后字节数与输出路径。含 2 个单元测试。

## 设计意图 (Intent)

阶段一采用纯 Rust、零外部二进制依赖；图片降采样等重度压缩推迟到阶段三（需 pdfium）。

## 接口契约 (Interface)

- 工具 id: `compress_pdf`
- 参数: `{ input_path: string, output_path: string }`
- 输出 data: `{ output_path, before_size, after_size }`

## 变更日志 (Changelog)

- 2026-06-03: 实现 lopdf save_modern 无损压缩与单测。

## 待办 / 风险 (TODO / Risks)

- 对已是现代 PDF 结构的文件，压缩率可能有限。
- 多档位/图片降采样需 pdfium，属阶段三。
