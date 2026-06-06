# DocPilot

DocPilot 是一个本地优先的 AI 文档工作台，也是后续 Tauri 2 桌面产品的基座项目。

当前项目不只服务于一个单一功能，而是同时承担两类目标：

- **产品验证**：围绕 Agent 交互、文件工具箱、Word/文档自动化持续孵化可用能力。
- **工程基座**：验证 Tauri 2 构建、部署、上线、sidecar、权限、安装包与在线更新等桌面产品基础设施。

## 项目定位

DocPilot 的长期方向是沉淀一套可复用的「本地工具 + AI Agent + 桌面发布」能力底座。当前功能按以下产品线组织：

| 产品线 | 定位 | 当前重点 |
| --- | --- | --- |
| Agent Lab | 持续演进的 Agent 交互与工具调用基座 | Craft Demo、流式 Markdown、工具编排、未来特定 Agent 接入 |
| 工具箱 | 高频本地文件工具集合，未来可独立成 App | PDF、图片、文件、文本、Markdown 转换等工具 |
| 文档工坊 | Word/文档自动化能力孵化区 | 批量排版、模板生成、模板学习与智能生成 |
| Tauri 基座 | 后续桌面产品的工程底层 | Tauri 2、sidecar、打包发布、DMG、在线更新、跨平台能力 |

## 当前能力

### Agent Lab

- Craft Demo 作为主 Agent UI，学习 Craft Agents 的交互逻辑与工作流组织方式。
- 基于 Vercel AI SDK，支持自然语言调用已注册工具。
- 助理回复使用 `markstream-vue` 流式渲染 Markdown。
- Agent 能力作为长期基座维护，后续可接入面向特定场景的 Agent。

### 工具箱

工具中心当前包含 **24 个**本地工具：

| 分类 | 工具 |
| --- | --- |
| PDF | 压缩、合并、拆分、信息、旋转、提取页、删页、重排、插空白页、复制页 |
| 图片 | 信息、压缩、缩放、格式转换、裁剪、旋转、拼接、转 PDF |
| 文件 | 信息、哈希、复制、移动 |
| 文本/转换 | 文本转 PDF、转 Markdown |

### 文档工坊

文档工坊先以 Word 为核心，暂时把三类能力放在同一条线上验证：

- **Word 批量排版**：批量统一 `.docx` 格式，支持政府格式、论文格式、期刊论文等预设。
- **Word 模板生成**：根据固定 Word 模板与输入内容生成新的文档。
- **Word 智能文档**：学习任意 Word 模板，沉淀样式与章节结构，再用现成内容或 LLM 生成新文档。

这几块共享文档解析、样式识别、生成、校验等底层能力；未来是否拆成独立产品再根据验证结果决定。

## 技术栈

- 前端：Vue 3 + TypeScript + **Vite+**（`vp`）+ UnoCSS + VueUse
- 客户端：Tauri 2
- 工具核心：Rust（lopdf · image · printpdf）
- Agent：Vercel AI SDK + markstream-vue
- 文档处理：Python sidecar / python-docx / MarkItDown / LibreOffice（按功能需要）
- 共享契约：`@docpilot/shared-types`

## 开发环境

1. 安装 [Rust](https://rustup.rs/) 与 [Node.js](https://nodejs.org/)（推荐 22+）
2. 安装 Vite+ CLI：`npm i -g @vitejs/plus`
3. 安装依赖：`pnpm install`
4. 复制 `.env.example` 为 `.env`，填写大模型配置（见下）

### 大模型配置（.env）

在项目根目录创建 `.env`（已被 git 忽略），使用 `VITE_` 前缀以便前端读取：

| 变量 | 说明 |
| --- | --- |
| `VITE_LLM_BASE_URL` | OpenAI 兼容接口地址 |
| `VITE_LLM_API_KEY` | API 密钥（Ollama 可填 `ollama`） |
| `VITE_LLM_MODEL` | 模型名，须支持 Tool Call |

设置 `VITE_LLM_MODEL` 后，应用内「系统设置」以只读方式展示当前值；**修改 .env 后需重启** `npx tauri dev`。未配置 env 时仍可在设置页保存到本地 store。

### 可选依赖

```bash
# Markdown / Office 转换开发依赖
pnpm run markitdown:install

# Word 批量排版依赖
pnpm run word-typeset:install

# Word 智能文档依赖（含 LibreOffice 检测）
pnpm run word-smart-doc:install
```

正式发布包通过 `docpilot-convert` sidecar 内置转换能力，用户无需单独安装 Python/OCR 依赖。

## 常用命令

```bash
# 仅前端
vp dev

# Tauri 开发（前端 + Rust）
npx tauri dev

# 测试
vp test
cargo test --manifest-path src-tauri/Cargo.toml

# 代码检查
vp check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# 本地完整 CI
pnpm run hooks:install
pnpm run ci:local

# 发布构建（内置 MarkItDown + OCR，无需用户单独安装依赖）
pnpm run tauri:build
```

开发完成后请重新启动项目，确认前端与 Tauri 桌面端状态一致：

```bash
lsof -ti:4729 | xargs kill -9 2>/dev/null
pkill -f "tauri dev" 2>/dev/null
npx tauri dev
```

确认：

- 前端：http://localhost:4729/
- 桌面应用 `docpilot` 窗口已打开

日常 push 不触发 GitHub 自动 CI；请先通过 `pnpm run ci:local`，再执行 `git push`。不要在未确认需要时使用 `git push --no-verify`。

## 发布与安装

产物位于 `src-tauri/target/release/bundle/`（`.app` / `.dmg`）。

```bash
# mac 安装包
npx tauri build

# release 构建
pnpm run tauri:build
```

打 tag `v*` 推送后将由 GitHub Actions 自动构建 Release 并上传 `.dmg`。

### Release `.dmg` 安装（推荐）

1. 打开 `.dmg`，将 **DocPilot** 拖到 **应用程序** 文件夹
2. 双击 **解除隔离** 图标，终端会自动执行 `xattr -d com.apple.quarantine /Applications/DocPilot.app`
3. 从启动台或「应用程序」打开 DocPilot

DMG 窗口内有分步引导图；脚本与背景资源见 `src-tauri/dmg/`。

### macOS：提示「DocPilot.app 已损坏，无法打开」

多为 **Gatekeeper / 隔离属性**（从浏览器或 Release 下载、或未公证的本地构建），并非应用文件真的损坏。

从 Release `.dmg` 安装时，优先使用 DMG 内的 **解除隔离** 图标。若已拖入应用程序仍被拦截，可手动执行：

```bash
xattr -d com.apple.quarantine "/Applications/DocPilot.app"
# 或清除全部扩展属性：
xattr -cr "/Applications/DocPilot.app"
open "/Applications/DocPilot.app"
```

仍被拦截时，可在 **系统设置 → 隐私与安全性** 中点 **仍要打开**；或右键应用 → **打开**（首次会多一步确认）。

本地 `tauri build` / `pnpm run tauri:build` 后直接运行 `.app`：

```bash
APP="src-tauri/target/release/bundle/macos/DocPilot.app"
xattr -cr "$APP"
open "$APP"
```

从 `.dmg` 挂载目录运行（未拖入应用程序）：

```bash
# 将 /Volumes/DocPilot 换成实际挂载卷名（在 Finder 侧边栏可见）
xattr -cr "/Volumes/DocPilot/DocPilot.app"
open "/Volumes/DocPilot/DocPilot.app"
```

可选：查看 Gatekeeper 评估结果（便于排查签名问题）：

```bash
spctl -a -vv -t execute "/Applications/DocPilot.app"
```

开发调试请优先使用 `npx tauri dev`，无需处理上述隔离。

## 架构文档

- [整体架构设计](docs/superpowers/specs/2026-06-03-docpilot-architecture-design.md)
- [扩展 20 工具设计](docs/superpowers/specs/2026-06-03-extend-20-tools-design.md)
- [扩展 20 工具实施计划](docs/superpowers/plans/2026-06-03-extend-20-tools.md)

## FEATURE.md 约定

每个功能目录维护 `FEATURE.md`，修改前先读、改后立即更新「现状」与「变更日志」。详见 `.cursor/rules/feature-md.mdc`。

## 路线图

- **Agent Lab**：持续完善 Craft Demo、工具编排、执行过程可视化、长任务与特定 Agent 接入方式。
- **工具箱**：继续扩展 PDF、Word、Excel、图片、icon、OCR、批量转换等本地工具。
- **文档工坊**：验证 Word 批量排版、模板生成、模板学习、格式校验与自动化测试的产品边界。
- **Tauri 基座**：完善构建、部署、在线更新、sidecar、安装包体验、跨平台发布与本地 CI。
