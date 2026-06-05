# 文件转 Markdown（MarkItDown）

## 现状 (Status)

已接入 Microsoft [MarkItDown](https://github.com/microsoft/markitdown)：Rust 工具 `convert_to_markdown` 优先调用 Tauri sidecar `docpilot-convert`（发布构建内嵌 markitdown + poppler + tesseract + OCR）；开发态回退项目 `.venv` 或 PATH。前端 `ConvertToMarkdown.vue` + `useConvertToMarkdown`。开发依赖：`pnpm run markitdown:install`；发布构建：`pnpm run build:sidecar`（CI / `tauri:build` 自动执行）。

## 设计意图 (Intent)

用官方 Python 转换器覆盖 Office/PDF/图片等多格式 → Markdown，供 Agent 与工具中心共用；不重复实现格式解析。

## 接口契约 (Interface)

- 工具 id：`convert_to_markdown`
- 参数：`input_path`（必填）、`output_path`（可选）、`use_plugins`（可选）
- 返回：`output_path`、`char_count`、`markdown_preview`（前 2000 字符）

## 变更日志 (Changelog)

- 2026-06-04: Release 增加 Windows x64 / ARM64 构建与 sidecar（`build-docpilot-convert-sidecar.ps1`）。
- 2026-06-04: 发布版内置 `docpilot-convert` sidecar（PyInstaller + magika 模型 + 捆绑 poppler/tesseract），用户无需单独安装 Python/OCR。
- 2026-06-04: PNG/JPG 等图片在 markitdown 无输出时自动 tesseract OCR（与扫描 PDF 同一套回退）。
- 2026-06-04: 扫描件 PDF 在 markitdown 无文本时自动 OCR（pdftoppm + tesseract）；空文件会报错而非 0 字节成功。
- 2026-06-04: 修复默认输出路径重复拼接（`fileStem`）；Rust 侧规范化历史错误路径。
- 2026-06-04: 修复桌面端运行时从项目根 `.venv` 定位 markitdown（不再依赖进程 cwd）。
- 2026-06-04: 初始集成 MarkItDown CLI 与工具中心页面。

## 待办 / 风险 (TODO / Risks)

- Release CI 构建 macOS DMG、Windows x64/ARM64 NSIS；sidecar 命名遵循 Tauri `*-pc-windows-msvc.exe` / `*-apple-darwin`。
- 开发态 OCR 仍依赖本机 `poppler`/`tesseract`；发行版已捆绑。
- 中文 OCR 质量取决于打包的 tessdata；可选在构建脚本中加入 `tesseract-lang`。
- 大文件预览仅截断展示，勿将全部 markdown 塞进 Agent 上下文。
