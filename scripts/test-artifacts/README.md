# 测试运行产物

本目录存放自动化测试与 `generate-*.py` 脚本**运行时生成**的 docx、报告等文件，**不纳入版本控制**。

| 子目录 | 来源 |
|--------|------|
| `word-typeset/` | `pnpm run word-typeset:test`、期刊/论文/公文等生成脚本 |
| `word-smart-doc/` | `pnpm run word-smart-doc:make-fixtures` 及 smart-doc 测试链 |
| `word-template/` | `pnpm run word-template:test` |

静态夹具（图片、`.txt` 原文、模板脚本）仍在各 `*-test-data/` 目录。
