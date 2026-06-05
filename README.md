# DocPilot

跨平台「文件工具集 + AI 智能体」桌面应用。

## 技术栈

- 前端：Vue 3 + TypeScript + **Vite+**（`vp`）+ UnoCSS + VueUse
- 客户端：Tauri 2
- 工具核心：Rust（lopdf · image · printpdf）
- Agent：Vercel AI SDK（自然语言调用全部已注册工具）

## 工具集（23 个）

| 分类 | 工具                                                               |
| ---- | ------------------------------------------------------------------ |
| PDF  | 压缩、合并、拆分、信息、旋转、提取页、删页、重排、插空白页、复制页 |
| 图片 | 信息、压缩、缩放、格式转换、裁剪、旋转、拼接、转 PDF               |
| 文件 | 信息、哈希、复制、移动                                             |
| 文本 | 文本转 PDF                                                         |

## 开发环境

1. 安装 [Rust](https://rustup.rs/) 与 [Node.js](https://nodejs.org/)（推荐 22+）
2. 安装 Vite+ CLI：`npm i -g @vitejs/plus`
3. 安装依赖：`pnpm install`
4. 复制 `.env.example` 为 `.env`，填写大模型配置（见下）

### 大模型配置（.env）

在项目根目录创建 `.env`（已被 git 忽略），使用 `VITE_` 前缀以便前端读取：

| 变量                | 说明                             |
| ------------------- | -------------------------------- |
| `VITE_LLM_BASE_URL` | OpenAI 兼容接口地址              |
| `VITE_LLM_API_KEY`  | API 密钥（Ollama 可填 `ollama`） |
| `VITE_LLM_MODEL`    | 模型名，须支持 Tool Call         |

设置 `VITE_LLM_MODEL` 后，应用内「系统设置」以只读方式展示当前值；**修改 .env 后需重启** `npx tauri dev`。未配置 env 时仍可在设置页保存到本地 store。

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

# mac 安装包
npx tauri build
```

产物位于 `src-tauri/target/release/bundle/`（`.app` / `.dmg`）。

**Release `.dmg` 安装（推荐）：**

1. 打开 `.dmg`，将 **DocPilot** 拖到 **应用程序** 文件夹
2. 双击 **解除隔离** 图标 — 终端会自动执行 `xattr -d com.apple.quarantine /Applications/DocPilot.app`
3. 从启动台或「应用程序」打开 DocPilot

DMG 窗口内有分步引导图；脚本与背景资源见 `src-tauri/dmg/`。

### macOS：提示「DocPilot.app 已损坏，无法打开」

多为 **Gatekeeper / 隔离属性**（从浏览器或 Release 下载、或未公证的本地构建），并非应用文件真的损坏。

**从 Release `.dmg` 安装：** 优先使用 DMG 内的 **解除隔离** 图标（见上）。若已拖入应用程序仍被拦截，可手动执行：

```bash
xattr -d com.apple.quarantine "/Applications/DocPilot.app"
# 或清除全部扩展属性：
xattr -cr "/Applications/DocPilot.app"
open "/Applications/DocPilot.app"
```

仍被拦截时，可在 **系统设置 → 隐私与安全性** 中点 **仍要打开**；或右键应用 → **打开**（首次会多一步确认）。

**本地 `tauri build` / `pnpm run tauri:build` 后直接运行 `.app`：**

```bash
APP="src-tauri/target/release/bundle/macos/DocPilot.app"
xattr -cr "$APP"
open "$APP"
```

**从 `.dmg` 挂载目录运行（未拖入应用程序）：**

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

发布构建（内置 MarkItDown + OCR，无需用户单独安装依赖）：

```bash
pnpm run tauri:build
```

打 tag `v*` 推送后将由 GitHub Actions 自动构建 Release 并上传 `.dmg`。

## 架构文档

- [整体架构设计](docs/superpowers/specs/2026-06-03-docpilot-architecture-design.md)
- [扩展 20 工具设计](docs/superpowers/specs/2026-06-03-extend-20-tools-design.md)
- [扩展 20 工具实施计划](docs/superpowers/plans/2026-06-03-extend-20-tools.md)

## FEATURE.md 约定

每个功能目录维护 `FEATURE.md`，修改前先读、改后立即更新「现状」与「变更日志」。详见 `.cursor/rules/feature-md.mdc`。

## 路线图

- **已完成**：23 工具 + Agent + CI 骨架
- **待办**：OCR、PDF 转 Word（Python sidecar）、移动端
