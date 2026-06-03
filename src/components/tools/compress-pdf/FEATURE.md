# PDF 压缩工具页（前端）

## 现状 (Status)

已实现选 PDF 文件、调用 `compress_pdf`、展示压缩前后字节数与输出路径。逻辑在 `useCompressPdf` composable，含 composable 单测。

## 设计意图 (Intent)

阶段一最小 UI：无多档位，输出路径为源文件名加 `-compressed.pdf` 后缀。

## 接口契约 (Interface)

- 依赖 `runTool('compress_pdf', { input_path, output_path })`
- 依赖 `@tauri-apps/plugin-dialog` 的 `open` 选文件

## 变更日志 (Changelog)

- 2026-06-03: 实现 CompressPdf.vue；逻辑提取至 useCompressPdf + 单测（兼容 Vite+ vitest）。

## 待办 / 风险 (TODO / Risks)

- 输出路径目前自动生成，后续可增加「另存为」对话框。
