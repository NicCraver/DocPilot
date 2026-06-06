# Word 模板生成

## 现状 (Status)

已实现独立 UI 模块（`WordTemplateFill.vue`）：上传 Word 模板、上传内容（docx/txt/md）或粘贴文本，可选填写汇报人/日期，点击「生成 Word」输出与模板版式一致的 docx。

后端：`scripts/word-template-fill.py`（python-docx）经 `word_template_util.rs` 调用；Tauri 命令 `generate_word_from_template`。

测试数据：`scripts/word-template-test-data/`（美腾 2025 年终总结模板 + 约 2193 字 Markdown 样例）；`pnpm run word-template:test`。

## 设计意图 (Intent)

让用户用固定企业/机关 Word 模板快速套打个人文稿，保留模板标题层级与页面设置，自动剔除红色填写说明。

## 接口契约 (Interface)

- 前端：`useWordTemplateFill()` — 模板/内容路径、文本模式、invoke 生成
- Tauri：`generate_word_from_template(template_path, output_path, content_path?, content_text?, content_kind?, reporter?, report_date?)`
- Python CLI：`word-template-fill.py '<json>'`

## 变更日志 (Changelog)

- 2026-06-06: 初始实现 Word 模板生成功能、测试样例与自动化脚本。

## 待办 / 风险 (TODO / Risks)

- 章节匹配依赖标题关键词，非标准模板需扩展 `SECTION_DEFS` 或提供映射配置。
- 封面页空白段落保留原样；复杂文本框/页眉内占位尚未解析。
