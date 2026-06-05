# Word 批量排版

## 现状 (Status)

已实现独立 UI 模块（`WordTypeset.vue`），对齐 DocPilot 设计令牌与 `AppButton` 组件：左侧分段切换（文件批量 / 输入文本）、文件列表（文件名+路径、空状态、计数徽章）、`AppButton` 主操作、可折叠运行日志；右侧配置区带**政府格式 / 论文格式**预设切换（Tauri Store 自动缓存）、分区卡片与 Lucide 图标标题、统一表单控件焦点环，底部导入/导出 JSON 与「存为政府默认」操作栏。

配置缓存：`src/lib/wordTypesetStore.ts`（`word-typeset-config.json`），修改表单 debounce 自动写入当前预设；切换预设时加载对应缓存。

预设：`governmentWordTypesetConfig()` 机关公文；`thesisWordTypesetConfig()` 学位论文（黑体标题、宋体小四正文、首行缩进 0.74cm）。

后端：`scripts/word-typeset.py`（python-docx）经 `word_typeset_util.rs` 调用；Tauri 命令 `format_docx_batch` / `format_docx_text`；Agent 工具 `format_docx_batch` / `format_docx_text`。

内置默认对齐机关公文参考工具：方正小标宋题目、楷体\_GB2312 副标题/二级标题、仿宋\_GB2312 正文与表格、黑体图表题与附件、Times New Roman 数字字母、表格行距 22 磅、附件默认启用。

依赖安装：`node scripts/ensure-word-typeset.mjs`（复用项目 `.venv`）。

预设：`governmentWordTypesetConfig()` 机关公文；`thesisWordTypesetConfig()` 学位论文；`journalWordTypesetConfig()` 学术期刊（对齐《煤炭工程》类 PDF：页眉、doi、摘要悬挂缩进、前置单栏+正文双栏、数字标题、三线表、双语表题、引文上标 `[1]`）。

自动化测试：`pnpm run word-typeset:test` — **10 场景 / 90 项**；`pnpm run word-typeset:thesis-test`；`pnpm run word-typeset:journal-test` — 期刊样例（选煤固废论文结构，10 项校验）；`pnpm run word-typeset:coal-paper-full` — 从用户 PDF《选煤固废资源化利用研究进展》生成复杂 docx（约 1.6 万字、6 表、11 图）并排版校验。

## 设计意图 (Intent)

为机关/办公场景提供可配置的 Word (.docx) 批量统一排版，配置可 JSON 持久化，与 DocPilot 本地工具链集成。

## 接口契约 (Interface)

- 前端：`useWordTypeset()` — 文件列表、配置 state、invoke 排版与配置读写
- Tauri：`format_docx_batch`、`format_docx_text`、`list_docx_in_dir`、`typeset_read_text_file`、`typeset_write_text_file`
- Python CLI：`word-typeset.py '<json>'`，`mode` 为 `batch` 或 `text`

## 变更日志 (Changelog)

- 2026-06-05: 新增 `word-typeset:coal-paper-full`：从《煤炭工程》PDF 双栏提取正文，按字号识别章节并注入数字标题，生成复杂测试 docx 并校验双栏/页眉/上标/图表。
- 2026-06-05: 期刊论文补全：页眉（题名页/正文页）、doi、after_front_matter 双栏、引文上标、英文表题、引言双栏节。
- 2026-06-05: 新增「期刊论文」预设（双栏、摘要悬挂缩进、数字编号标题、三线表）；样例对齐用户提供的《煤炭工程》PDF 结构。
- 2026-06-05: 修复政府/论文预设切换不生效：消除 initFromCache 竞态、切换时先更新内存状态再写缓存。
- 2026-06-05: 表单样式二次优化：统一四列网格、字段分组（字体/字号/行距子标签）、复选框卡片栅格、行间距与列对齐。
- 2026-06-05: UI 优化：设计令牌统一、分段 Tab、文件列表空状态、可折叠日志、配置分区卡片与 AppButton 操作栏。
- 2026-06-05: 对齐机关公文默认：方正小标宋/楷体\_GB2312/仿宋\_GB2312；表格行距(磅)、自动列宽、TXT空行合并、符号格式化、MD标题识别；二级标题默认不加粗。
- 2026-06-05: 测试 docx 改为中文名；新增公文长文、中文路径（某市发改委/报送材料/《…》）场景。
- 2026-06-05: 扩展测试至多场景（复杂混排、双表、附件、启发式、批量、表格禁用等）；题注/表题缩进与中文序号题注识别优化。
- 2026-06-05: 修复 Subtitle 样式误识别为 Title（子串 `title`）；ascii 字体分设中西文；新增自动化格式校验与测试样例。
- 2026-06-05: 初始实现 Word 批量排版 UI、Python 排版引擎与 Tauri/Agent 工具注册。

## 待办 / 风险 (TODO / Risks)

- 页码奇偶分页对齐需依赖 Word 分节，当前为统一页脚页码字段。
- 样式识别已支持精确样式名 + 中文序号启发式（一、/（一））；非标准模板仍可能需调整。
- 发布包需决定是否将 python-docx 打入 sidecar 或文档说明开发环境安装步骤。
