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
