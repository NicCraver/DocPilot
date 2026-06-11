# Word 批量排版

## 现状 (Status)

正式页采用 **方案 A · 双栏工作台**（`WordTypesetProduction.vue`）：左侧文件队列与执行，右侧排版方案与配置。

**方案管理**：内置（政府/论文/期刊）+ 自定义方案；「+」弹窗添加；齿轮菜单含导入 JSON、导出当前/全部方案、复制方案、恢复默认、重命名/删除自定义方案。缓存 v2：`profiles` + `presets` + `ui` 偏好。

**输出模式**：覆盖原文件（自动 `.docx.bak`）、输出到文件夹、同目录副本（可配置后缀）；支持单文件失败继续；文件列表显示逐文件成功/失败状态。

**配置 UI**：`WordTypesetConfigPanel` 统一承载页面/标题/正文/表格/其他配置（原生 `select` / `input` / `checkbox`）；期刊双栏专区独立组件 `WordTypesetJournalSection`。选期刊方案或启用双栏时自动展示期刊专区。

**交互**：拖放 docx、样例 docx/文本、首次引导、运行后打开输出、日志复制、⌘/Ctrl+Enter 排版、⌘/Ctrl+O 添加文件。Agent 工具 `format_docx_*` 读取排版页当前激活方案缓存。

后端：`scripts/word-typeset.py`；Tauri `format_docx_batch` / `format_docx_text` / `reveal_path_in_folder` / `open_path_with_default_app`。

测试：`pnpm run word-typeset:test` 等。

## 设计意图 (Intent)

为机关/办公场景提供可配置的 Word (.docx) 批量统一排版，配置可 JSON 持久化，与 DocPilot 本地工具链集成。

## 接口契约 (Interface)

- 前端：`useWordTypeset()` — 文件列表、配置 state、输出模式、invoke 排版与配置读写
- 配置：`src/lib/wordTypesetStore.ts` — `loadActiveTypesetConfig()` 供 Agent 工具共用
- Tauri：`format_docx_batch`（含 `output_mode` / `output_dir` / `output_suffix` / `continue_on_error`）、`format_docx_text`、路径打开/定位
- Python CLI：`word-typeset.py '<json>'`，`mode` 为 `batch` 或 `text`

## 变更日志 (Changelog)

- 2026-06-10: 配置区抽离 `WordTypesetConfigPanel`；期刊/输出/方案弹窗等子组件拆分；表单保持原生 HTML 控件。
- 2026-06-10: 修复样例 docx（Tauri camelCase `outputPath`）；引导卡牌居中；添加/编辑方案支持图标与说明；自定义方案内联编辑/删除；配置修改「已自动保存」提示。
- 2026-06-10: 全面完善：期刊 UI、首行缩进修复、三种输出模式、逐文件状态、拖放/引导/样例、方案复制与导出当前、Agent 工具读缓存、日志复制与打开输出。
- 2026-06-10: 修复添加方案无响应（改用 `WordTypesetPresetDialog`）；设置菜单改为导出全部方案包；导入支持方案包。
- 2026-06-10: 按方案 A 重构正式页：双栏工作台、方案栏 + 设置菜单、自定义方案增删改；缓存升级 v2（profiles + 任意 preset id）。

## 待办 / 风险 (TODO / Risks)

- 页码奇偶分页对齐需依赖 Word 分节，当前为统一页脚页码字段（UI 已标注）。
- 样式识别已支持精确样式名 + 中文序号启发式；非标准模板仍可能需调整。
- 发布包需决定是否将 python-docx 打入 sidecar 或文档说明开发环境安装步骤。
- `.doc` 旧格式暂不支持，仅 `.docx`。
