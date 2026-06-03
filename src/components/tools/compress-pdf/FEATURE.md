# PDF 压缩工具页（前端）

## 现状 (Status)

已实现选 PDF 文件、调用 `compress_pdf`、展示压缩前后字节数与输出路径。逻辑在 `useCompressPdf` composable，含 composable 单测。
界面已全面美化，采用精致的 Exaggerated Minimalism 设计风格，包含：

- 拟真虚线拖拽区域（Dropzone）式文件选择器，支持文件类型图标与路径展示。
- 优雅的加载动画与操作反馈。
- 直观的压缩结果展示，包含文件体积对比进度条、百分比计算、人性化字节单位转换（KB/MB）。

## 设计意图 (Intent)

阶段一最小 UI：无多档位，输出路径为源文件名加 `-compressed.pdf` 后缀。

## 接口契约 (Interface)

- 依赖 `runTool('compress_pdf', { input_path, output_path })`
- 依赖 `@tauri-apps/plugin-dialog` 的 `open` 选文件

## 变更日志 (Changelog)

- 2026-06-03: 全面美化前端 UI，设计精致的文件选择拖拽区、压缩体积对比进度条及加载动画，极大提升用户体验。
- 2026-06-03: 实现 CompressPdf.vue；逻辑提取至 useCompressPdf + 单测（兼容 Vite+ vitest）。

## 待办 / 风险 (TODO / Risks)

- 输出路径目前自动生成，后续可增加「另存为」对话框。
