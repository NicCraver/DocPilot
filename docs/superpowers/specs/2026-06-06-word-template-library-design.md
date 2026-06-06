# word-template-library：Word 智能模板库 设计

- 日期：2026-06-06
- 状态：待批准
- 路线：**混合策略（克隆原 docx 保骨架 + 提取样式 profile 自适应排版）+ 双内容入口（现成内容 / LLM 生成）**

## 1. 背景与问题

DocPilot 已有两个 Word 相关模块：

- `word-typeset`（Word 批量排版）：基于内置预设（政府/论文/期刊）配置对 docx 统一格式化，配置 JSON 持久化。
- `word-template-fill`（Word 模板生成）：上传一份固定 Word 模板，把内容套打进去并保留版式，输出 docx。

两者的关键局限：

1. **章节结构硬编码**：`scripts/word-template-fill.py` 的 `SECTION_DEFS` 是针对"美腾年终总结"模板手写的关键词表，无法适配任意上传的 Word。
2. **没有模板库**：模板是单次上传、立即套打，无法沉淀、列出、复用。
3. **没有 LLM 生成内容的闭环**：只能套打用户已有的现成内容。

本模块在现有底层能力之上，补齐**「学习任意 docx → 沉淀模板库 → 选模板 → (现成内容自适应排版 / LLM 按章节生成) → 产出 docx」**的完整工作流。

## 2. 目标与非目标

**目标：**

1. 学习用户上传的任意 docx，提取格式、结构、样式等信息，沉淀为可复用的模板库条目。
2. 模板库可持久化、列出、选择、重命名、删除，带缩略图预览。
3. 选定模板后支持两条内容路径：① 粘贴/上传现成内容做自适应排版；② 输入主题/要点由 LLM 按模板章节结构生成正文。
4. 两条路径统一汇入排版灌入，产出与模板版式一致的 docx。
5. 提取出的样式 profile 可在 UI 内手动微调。
6. 复用现有三层架构（前端 Composable + Tauri 命令 + Python 引擎）与现有 Python 能力，不重复造轮子。

**非目标：**

- 不删除/重构现有 `word-typeset`、`word-template-fill` 模块（本模块为全新独立模块，复用其 Python 能力作底层）。
- 不做云端模板同步（模板库存本地 app data 目录）。
- 不追求 100% 还原任意复杂排版（复杂文本框/嵌套表格依赖原 docx 骨架兜底，超出 profile 表达能力的部分沿用原样式）。

## 3. 整体架构

延续项目「前端 Composable + Tauri 命令 + Python 引擎」三层模式。

```
上传 docx ──[学习]──> 模板库(骨架docx + profile.json + meta + 缩略图)
                              │
                          [选择模板]
                              │
              ┌───────────────┴───────────────┐
        粘贴/上传现成内容                  输入主题/要点
              │                               │
        [解析为章节]                    [LLM 按章节结构生成]
              └───────────────┬───────────────┘
                        [自适应排版灌入]
                              │
                     [克隆骨架 + 灌入内容]
                              │
                         产出 .docx
```

| 层 | 内容 | 复用/新增 |
|---|---|---|
| 前端 UI | `WordTemplateLibrary.vue` + `useWordTemplateLibrary()` | 新增，对齐 `WordTypeset.vue` 设计令牌、`AppButton` |
| LLM 层 | 复用 `src/agent`（Vercel AI SDK）按模板章节结构生成正文 | 复用 |
| Tauri 命令 | 学习、列出/删除/重命名、生成文档、缩略图 | 新增 `word_template_library_util.rs` |
| Python 引擎 | ① `word-template-learn.py`（提取骨架+profile）② 基于 profile 的排版灌入（重构现有 `fill_template` 逻辑，去硬编码） | 新增 1 个 + 重构灌入 |
| 存储 | app data 目录下 `template-library/<id>/` | 新增 |

**关键设计决策**：章节结构与样式从「学习模板」时**动态提取**并存入 `profile.json`，生成时按学到的结构匹配，替代现有硬编码 `SECTION_DEFS`，从而适配任意 Word。

## 4. 学习模板：提取范围与 profile 数据结构

学习一份 docx 时分两部分落盘。

### 4.1 骨架 docx（`original.docx`）

原样保存，承载混合策略的「保真」部分：页面设置（页边距、纸张、分节）、页眉页脚、封面、命名样式表（styles.xml）、复杂表格/文本框/图片等 python-docx 难以重建的元素。生成时克隆它再灌内容。

### 4.2 profile.json

结构化提取的「样式画像」，承载「自适应排版」部分：

```json
{
  "version": 1,
  "page": { "size": "A4", "margins_cm": { "top": 2.54, "bottom": 2.54, "left": 3.18, "right": 3.18 } },
  "styles": {
    "title":    { "font_ascii": "Times New Roman", "font_ea": "方正小标宋", "size_pt": 22, "bold": false, "align": "center", "line_spacing": 1.5 },
    "heading1": { "font_ea": "黑体", "size_pt": 16, "bold": true, "align": "left", "outline_level": 1 },
    "heading2": { "font_ea": "楷体_GB2312", "size_pt": 15, "bold": false, "outline_level": 2 },
    "body":     { "font_ea": "仿宋_GB2312", "size_pt": 16, "first_line_indent_chars": 2, "line_spacing": 1.5, "align": "justify" }
  },
  "structure": [
    { "key": "auto_1", "title": "前言",   "level": 1, "placeholder": true },
    { "key": "auto_2", "title": "工作成果", "level": 1 }
  ],
  "meta_fields": [ { "label": "汇报人", "pattern": "汇报人[：:]" }, { "label": "日期", "pattern": "日期[：:]" } ]
}
```

### 4.3 提取逻辑（Python，基于 python-docx）

- **样式**：扫描段落，按 Word 内建样式名（Title / Heading 1-N / Normal）+ 字号字体启发式（复用 `word-typeset.py` 已有的中西文字体、字号、行距、缩进识别），归纳 title / heading{n} / body 的代表样式。
- **结构**：识别标题层级（样式名 + 加粗 + 编号/中文序号「一、（一）」启发式，现有代码已具备），输出有序章节树，每节带 `title`、`level`。
- **占位/说明**：复用现有 `paragraph_is_guide` / `paragraph_is_red_instruction`，标记"填写说明"段（生成时删除）。
- **元字段**：识别"汇报人/日期"等可填字段（可扩展）。

`profile.json` 让 LLM 生成与自适应排版都能知道每一级标题/正文该用什么样式，且用户可在 UI 微调。

## 5. 生成阶段：双路径 + 统一灌入

### 5.1 路径 1：自适应排版（现成内容）

用户粘贴文本 / 上传 docx / md。解析为「章节 → 段落」：

- Markdown：按 `#` 层级切分，映射到 profile 标题层级。
- 纯文本：按空行分段；匹配 profile 章节标题或中文序号的行视为标题。
- docx：提取文本（剔除说明段）后同上解析。
- 章节匹配：先按标题文字与 `profile.structure` 模糊匹配；匹配不到的内容按顺序顺次填入剩余章节；内容章节多于模板时，超出部分按 body 样式续写文末（不丢内容）。

### 5.2 路径 2：LLM 生成（主题/要点）

用户输入主题 + 要点提示。把 `profile.structure`（章节标题+层级）+ 用户提示喂给 LLM（复用 `src/agent` 的 Vercel AI SDK），按模板章节结构逐节生成正文，输出结构化 JSON（`{章节key: [段落...]}`）。生成结果可在 UI 预览/编辑（markstream-vue 流式渲染），再进入排版。

### 5.3 统一排版灌入（Python）

拿到「章节 → 段落」结构后：

1. 克隆 `original.docx` 作为骨架。
2. 删除标记为说明/占位的段落。
3. 按 profile 样式定义，把每节标题/正文用对应字体字号行距缩进写入对应位置（重构现有 `fill_template`，样式来源从硬编码改为 profile）。
4. 回填元字段（汇报人/日期等）。
5. 保存为输出 docx。

### 5.4 错误处理

- 每步产生中文日志（沿用现有 logs 模式）。
- 模板缺失、profile 损坏、LLM 失败、内容为空均返回明确中文错误。
- LLM 路径失败可降级为「仅生成空章节骨架」或提示改用粘贴内容。

## 6. 存储设计

app data 目录下：

```
template-library/
  <id>/
    original.docx     # 骨架，保真兜底
    profile.json      # 样式画像 + 章节结构 + 元字段
    meta.json         # 名称、描述、创建时间、章节数等
    thumbnail.png     # 首页缩略图（预览）
```

- `<id>`：创建时生成（时间戳 + 随机短串）。
- 列表通过扫描目录 + 读 `meta.json` 构建。
- 重命名改 `meta.json`；删除移除整个 `<id>` 目录。
- 当前选中模板 id 用 Tauri Store 缓存（沿用 `word-typeset-config.json` 模式）。

## 7. UI 结构

`WordTemplateLibrary.vue`，对齐 `WordTypeset.vue` 设计令牌、`AppButton`、分区卡片、Lucide 图标、可折叠日志。顶部分段 Tab：`模板库` / `学习新模板` / `生成文档`。

- **学习新模板**：选择/拖入 docx → 「学习」→ 调 learn 命令 → 展示提取出的章节树与 profile 摘要（命名、描述）→ 存库。学习后提供「微调 profile」折叠面板（编辑 title/heading/body 字体字号等，写回 `profile.json`）。
- **模板库**：卡片网格（缩略图 + 名称 + 章节数 + 创建时间），支持选择、重命名、删除、设为当前；空状态引导去学习。
- **生成文档**：左侧选当前模板（显示章节结构），中间分段切换内容来源——
  - 「现成内容」：粘贴文本 / 上传 docx·txt·md + 元字段（汇报人/日期）。
  - 「LLM 生成」：主题 + 要点提示 + 模型按钮；结果 markstream-vue 流式预览、可编辑。
  - 底部「生成 Word」主操作 + 可折叠日志 + 生成后打开/定位文件。

`useWordTemplateLibrary()`：管理模板列表 state、当前选中、学习/生成 invoke、profile 编辑、LLM 调用、配置缓存。

## 8. 接口契约

- **前端**：`useWordTemplateLibrary()` — 模板列表、当前模板、学习/生成/列出/删除/重命名 invoke、profile 编辑、LLM 调用。
- **Tauri 命令**（`word_template_library_util.rs`）：
  - `learn_word_template(docx_path, name?, description?) -> TemplateMeta`
  - `list_word_templates() -> TemplateMeta[]`
  - `rename_word_template(id, name)`
  - `delete_word_template(id)`
  - `update_word_template_profile(id, profile_json)`
  - `generate_word_from_library(id, content_kind, content_path?|content_text?, sections_json?, reporter?, report_date?, output_path) -> { output, logs }`
- **Python CLI**：
  - `word-template-learn.py '<json>'` — 输入 docx 路径与目标目录，输出 profile.json / meta.json / 缩略图。
  - `word-template-fill.py`（重构）— 灌入逻辑从 profile 读取样式与结构，而非硬编码。
- **Agent 工具**：`generate_word_from_library`（供 Agent 调用，遵循 shared-types 工具注册）。

## 9. 测试方案

沿用 `scripts/run-*.mjs` + `package.json` 脚本约定，复用 `.venv`（python-docx 已在）：

- `word-template-library:learn-test`：用 `scripts/word-template-test-data/` 美腾模板跑学习，校验章节数、样式（标题字体/正文字号）、说明段识别。
- `word-template-library:adaptive-test`：学习后用样例 Markdown 走自适应排版，校验输出 docx 章节、字体字号行距、说明段已删除。
- `word-template-library:llm-test`：LLM 路径用 mock/固定返回（避免真实计费），校验结构化输出正确灌入排版。
- 新增一份结构不同的模板（如公文）验证"非硬编码、可适配任意模板"。

## 10. 待办 / 风险

- 缩略图渲染：python-docx 不直接出图，需评估方案（如 LibreOffice headless 转图，或简化为首页文本预览）。先以"首页文本预览"兜底，缩略图作为增强。
- LLM 生成质量依赖 prompt 工程，需要按模板结构约束输出格式（结构化 JSON）。
- 复杂表格/文本框灌入依赖原 docx 骨架，profile 无法表达的部分沿用原样式。
- 章节模糊匹配在结构差异大的模板上可能误匹配，需提供"按顺序填入"兜底与日志提示。
