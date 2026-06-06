# Word 智能文档（模板库）

## 现状 (Status)

全新独立模块（`WordSmartDoc.vue` + `useWordSmartDoc()`）：学习任意 docx 提取骨架+样式 profile+章节结构存入模板库（app data `smart-doc-library/<id>/`），三段 Tab（模板库 / 学习新模板 / 生成文档）。生成支持两条路径：现成内容自适应排版、LLM 按章节结构生成内容；产出与模板版式一致的 docx。缩略图用 LibreOffice headless 渲染，缺失时降级。

后端：`scripts/word-smart-doc-learn.py`（学习）、`scripts/word-smart-doc-fill.py`（灌入），经 `word_smart_doc_util.rs` 调用；Tauri 命令 `smart_doc_learn_template` / `smart_doc_list_templates` / `smart_doc_rename_template` / `smart_doc_delete_template` / `smart_doc_get_profile` / `smart_doc_update_profile` / `smart_doc_generate`。LLM 走 `src/agent/smartDocGenerate.ts`（Vercel AI SDK）。

依赖：`pnpm run word-smart-doc:install`（python-docx + LibreOffice 检测）。测试：`word-smart-doc:learn-test` / `word-smart-doc:adaptive-test` / `word-smart-doc:style-test`（格式断言）/ `word-smart-doc:e2e`（学习→模拟 LLM 章节→灌入 docx→校验字号字体，全链路）。

完全新写，不复用、不改动现有 `word-template-fill` / `word-typeset`。

## 设计意图 (Intent)

把任意 Word 的格式与结构沉淀为可复用模板库，再用现成内容或 LLM 生成内容自适应排版，闭环产出 docx。

## 接口契约 (Interface)

- 前端：`useWordSmartDoc()` — 模板列表、当前模板/profile、学习/生成/列出/删除/重命名、LLM 生成
- Tauri：见上 7 个命令
- Python CLI：`word-smart-doc-learn.py '<json>'`（{docx_path,dest_dir}）；`word-smart-doc-fill.py '<json>'`（{template_dir,output_path,content_kind,...}）

## 变更日志 (Changelog)

- 2026-06-06: 初始实现学习引擎、排版灌入、模板库管理、双内容路径与 UI。
- 2026-06-06: 学习引擎从 Normal 样式读取正文字号/字体，占位段不参与正文采样；灌入时挂接 Normal 段落样式；新增 `word-smart-doc:style-test` 自动化格式断言。
- 2026-06-06: 修复正文样式学习：优先从占位段落的段落样式（如「正文」）沿 basedOn 链解析小四/宋体，避免误读 Normal 四号；新增 realistic-body-style 回归用例。
- 2026-06-06: 新增 `word-smart-doc:e2e` 端到端脚本（学习→sections 灌入→正文字号校验）。

## 待办 / 风险 (TODO / Risks)

- LibreOffice 体积大，发布包是否内置待定；缺失降级文本占位。
- 章节模糊匹配在结构差异大的模板上可能误匹配，已有「按顺序续写文末」兜底。
- profile UI 微调当前仅展示结构，编辑写回 `smart_doc_update_profile` 待补全表单。
