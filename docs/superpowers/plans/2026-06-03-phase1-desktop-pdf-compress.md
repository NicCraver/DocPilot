# 阶段一：桌面端地基 + PDF 压缩 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 macOS 上用 Tauri2 + Vue3 + Vite+ 跑通一个最小可用的 PDF 压缩工具（选文件 → 选档位 → Rust 压缩 → 显示前后大小），并产出 mac 安装包，建立统一工具接口与全面测试 + CI 基线。

**Architecture:** 四层架构的前两步落地——UI 层（Vue 工具页）通过统一封装 `lib/tools.ts` 调用 Tauri 通用命令 `run_tool`；Rust 工具核心层用 `Tool` trait + `ToolRegistry` 注册 `compress_pdf`（基于 lopdf `save_modern()` 无损结构压缩）。Agent 层与 Python sidecar 本阶段不实现，但目录骨架与 `list_tools`/`run_tool` 通用命令先建好，保证后续零重构扩展。

**Tech Stack:** Tauri 2 (Rust), Vue 3 + TypeScript, Vite+ (`vp`, 内置 Vitest/Oxlint/Oxfmt), UnoCSS, VueUse, lopdf 0.40, GitHub Actions CI。

**关键取舍（来自架构 spec D1/D5）：** 第一步的"压缩"采用 lopdf 的 `save_modern()`（对象流 + 交叉引用流，PDF 1.5+），纯 Rust、零外部依赖、包体小。图片降采样压缩（需 pdfium 渲染、捆绑 ~10MB 二进制）推迟到阶段三，避免第一步引入交叉编译与体积复杂度。

---

## 前置说明

- 所有命令默认在仓库根目录 `/Users/nic/NicProjects/DocPilot` 执行，除非显式标注 `working_directory`。
- 包管理与脚本统一走 Vite+ 的 `vp`。若 `vp` 未全局安装，先 `npm i -g @vitejs/plus`（或按 `vp` 官方安装指引），并在 README 记录。
- 每个新建功能目录都必须同时创建 `FEATURE.md`（架构 spec 第 7 节强制约定）。
- 提交信息用中文（用户规则）。

---

## 文件结构（本阶段创建/修改）

**前端：**
- `package.json` —— 前端依赖与脚本（vp dev/build/test/check）
- `vite.config.ts` —— Vite+ 配置（Tauri 端口/HMR/envPrefix）
- `uno.config.ts` —— UnoCSS 配置
- `index.html`、`src/main.ts`、`src/App.vue` —— 应用入口
- `src/lib/tools.ts` —— `runTool()` / `listTools()` 统一封装（invoke 包装）
- `src/lib/tools.test.ts` —— tools 封装单测（mock invoke）
- `src/components/tools/compress-pdf/CompressPdf.vue` —— PDF 压缩工具页
- `src/components/tools/compress-pdf/CompressPdf.test.ts` —— 组件测试
- `src/components/tools/compress-pdf/FEATURE.md`

**Rust：**
- `src-tauri/Cargo.toml` —— 依赖（tauri, lopdf, serde, thiserror, async-trait）
- `src-tauri/tauri.conf.json` —— Tauri 配置（beforeDevCommand/devUrl/frontendDist/bundle）
- `src-tauri/src/main.rs`、`src-tauri/src/lib.rs` —— 入口与 builder
- `src-tauri/src/tools/mod.rs` —— `Tool` trait + `ToolRegistry` + 公共类型
- `src-tauri/src/tools/compress_pdf/mod.rs` —— `compress_pdf` 工具实现 + 单测
- `src-tauri/src/tools/compress_pdf/FEATURE.md`
- `src-tauri/src/commands.rs` —— `list_tools` / `run_tool` 两个通用命令

**契约与基础设施：**
- `.cursor/rules/feature-md.mdc` —— FEATURE.md 工作流规则
- `.github/workflows/ci.yml` —— CI（Rust 测试/clippy + 前端 vp check/test）
- `README.md` —— 项目说明与开发指引

---

## Task 1: 前端脚手架（Vite+ + Vue3）

**Files:**
- Create: `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `uno.config.ts`, `tsconfig.json`

- [ ] **Step 1: 用 Vite+ 创建 Vue3+TS 项目骨架**

在仓库根目录运行（非交互优先；若 `vp create` 仅交互式，则手动创建下列文件）：

```bash
vp create
# 选择：Vue + TypeScript 模板，目录选 . （当前目录）
```

若 `vp` 不可用，手动创建 `package.json`：

```json
{
  "name": "docpilot",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vp dev",
    "build": "vp build",
    "test": "vp test",
    "check": "vp check"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "@vueuse/core": "^11.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "unocss": "^0.63.0",
    "@vue/test-utils": "^2.4.6",
    "typescript": "^5.6.0",
    "vue-tsc": "^2.1.0"
  }
}
```

- [ ] **Step 2: 创建 `vite.config.ts`（含 Tauri 必要配置）**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  // 防止 vite 覆盖 rust 报错
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});
```

- [ ] **Step 3: 创建 `uno.config.ts`**

```typescript
import { defineConfig, presetUno } from 'unocss';

export default defineConfig({
  presets: [presetUno()],
});
```

- [ ] **Step 4: 创建入口文件**

`index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DocPilot</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:

```typescript
import { createApp } from 'vue';
import 'virtual:uno.css';
import App from './App.vue';

createApp(App).mount('#app');
```

`src/App.vue`:

```vue
<script setup lang="ts">
import CompressPdf from './components/tools/compress-pdf/CompressPdf.vue';
</script>

<template>
  <main class="p-6">
    <h1 class="text-2xl font-bold mb-4">DocPilot</h1>
    <CompressPdf />
  </main>
</template>
```

- [ ] **Step 5: 安装依赖并验证 dev server 启动**

Run: `vp install && vp dev`
Expected: dev server 在 `http://localhost:5173` 启动（此时 `CompressPdf.vue` 尚未创建会报错，属正常，Task 5 补齐；可先临时把 App.vue 的 import/标签注释掉验证启动后再恢复）。

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.ts uno.config.ts index.html src/ tsconfig.json
git commit -m "feat: 初始化 Vite+ Vue3 前端脚手架"
```

---

## Task 2: Tauri2 后端初始化

**Files:**
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: 初始化 Tauri 后端**

Run: `npx tauri init`
回答提示：
- App name: `DocPilot`
- Window title: `DocPilot`
- Web assets location: `../dist`
- Dev server url: `http://localhost:5173`
- Frontend dev command: `vp dev`
- Frontend build command: `vp build`

- [ ] **Step 2: 配置 `src-tauri/tauri.conf.json` 的 build 段**

确认/修改为：

```json
{
  "build": {
    "beforeDevCommand": "vp dev",
    "beforeBuildCommand": "vp build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  }
}
```

- [ ] **Step 3: 在 `src-tauri/Cargo.toml` 添加依赖**

```toml
[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
async-trait = "0.1"
thiserror = "2"
lopdf = "0.40"

[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 4: 验证 Tauri 能启动空窗口**

Run: `vp build && npx tauri dev`
Expected: 弹出标题为 "DocPilot" 的空窗口（前端显示 App.vue 内容）。

- [ ] **Step 5: Commit**

```bash
git add src-tauri/
git commit -m "feat: 初始化 Tauri2 后端并配置 Vite+ 集成"
```

---

## Task 3: Rust 统一工具接口（Tool trait + ToolRegistry）

**Files:**
- Create: `src-tauri/src/tools/mod.rs`

- [ ] **Step 1: 编写 ToolRegistry 的失败测试**

在 `src-tauri/src/tools/mod.rs` 末尾添加：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    struct EchoTool;

    #[async_trait::async_trait]
    impl Tool for EchoTool {
        fn id(&self) -> &str { "echo" }
        fn schema(&self) -> ToolSchema {
            ToolSchema {
                id: "echo".into(),
                description: "回显输入".into(),
                parameters: serde_json::json!({"type": "object"}),
                requires_confirmation: false,
            }
        }
        async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
            Ok(ToolOutput { data: input.args, message: "ok".into() })
        }
    }

    #[tokio::test]
    async fn registry_runs_registered_tool() {
        let mut reg = ToolRegistry::new();
        reg.register(Box::new(EchoTool));
        let out = reg
            .run("echo", ToolInput { args: serde_json::json!({"x": 1}) })
            .await
            .unwrap();
        assert_eq!(out.message, "ok");
    }

    #[tokio::test]
    async fn registry_unknown_tool_errors() {
        let reg = ToolRegistry::new();
        let err = reg
            .run("missing", ToolInput { args: serde_json::json!({}) })
            .await
            .unwrap_err();
        assert!(matches!(err, ToolError::NotFound(_)));
    }

    #[test]
    fn registry_lists_schemas() {
        let mut reg = ToolRegistry::new();
        reg.register(Box::new(EchoTool));
        let schemas = reg.list();
        assert_eq!(schemas.len(), 1);
        assert_eq!(schemas[0].id, "echo");
    }
}
```

注意：测试用到 `tokio`，在 `Cargo.toml` 的 `[dev-dependencies]` 追加 `tokio = { version = "1", features = ["macros", "rt"] }`。

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: 编译失败（`Tool`/`ToolRegistry`/`ToolInput`/`ToolOutput`/`ToolError`/`ToolSchema` 未定义）。

- [ ] **Step 3: 实现统一接口**

在 `src-tauri/src/tools/mod.rs` 顶部（测试模块之上）：

```rust
pub mod compress_pdf;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSchema {
    pub id: String,
    pub description: String,
    pub parameters: serde_json::Value, // JSON Schema
    pub requires_confirmation: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ToolInput {
    pub args: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct ToolOutput {
    pub data: serde_json::Value,
    pub message: String,
}

#[derive(Debug, thiserror::Error, Serialize)]
pub enum ToolError {
    #[error("未找到工具: {0}")]
    NotFound(String),
    #[error("参数错误: {0}")]
    InvalidInput(String),
    #[error("执行失败: {0}")]
    Execution(String),
}

#[async_trait]
pub trait Tool: Send + Sync {
    fn id(&self) -> &str;
    fn schema(&self) -> ToolSchema;
    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError>;
}

#[derive(Default)]
pub struct ToolRegistry {
    tools: HashMap<String, Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self { tools: HashMap::new() }
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.insert(tool.id().to_string(), tool);
    }

    pub fn list(&self) -> Vec<ToolSchema> {
        self.tools.values().map(|t| t.schema()).collect()
    }

    pub async fn run(&self, id: &str, input: ToolInput) -> Result<ToolOutput, ToolError> {
        let tool = self
            .tools
            .get(id)
            .ok_or_else(|| ToolError::NotFound(id.to_string()))?;
        tool.execute(input).await
    }
}
```

并在 `src-tauri/src/lib.rs` 加入 `mod tools;`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: 3 个测试 PASS（`registry_runs_registered_tool`、`registry_unknown_tool_errors`、`registry_lists_schemas`）。

注意：此步 `compress_pdf` 模块尚未创建，`pub mod compress_pdf;` 会编译失败。先在 Step 3 暂不写该行，待 Task 4 创建后再加入；或本步先创建空的 `src-tauri/src/tools/compress_pdf/mod.rs`。本计划采用后者：先建空文件。

- [ ] **Step 5: 创建工具接口 FEATURE.md 并提交**

`src-tauri/src/tools/FEATURE.md`（按 spec 模板，填写现状：已实现 Tool trait/ToolRegistry/统一类型）。

```bash
git add src-tauri/src/tools/mod.rs src-tauri/src/tools/FEATURE.md src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "feat: 实现 Rust 统一工具接口 Tool trait 与 ToolRegistry"
```

---

## Task 4: compress_pdf 工具实现（lopdf）

**Files:**
- Create: `src-tauri/src/tools/compress_pdf/mod.rs`, `src-tauri/src/tools/compress_pdf/FEATURE.md`

- [ ] **Step 1: 编写压缩工具的失败测试**

在 `src-tauri/src/tools/compress_pdf/mod.rs`：

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::tools::{Tool, ToolInput};

    fn write_sample_pdf(path: &std::path::Path) {
        // 用 lopdf 生成一个最小多对象 PDF，便于验证压缩后仍可加载
        let mut doc = lopdf::Document::with_version("1.4");
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(lopdf::dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
        });
        let pages = lopdf::dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        };
        doc.objects.insert(pages_id, lopdf::Object::Dictionary(pages));
        let catalog_id = doc.add_object(lopdf::dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        doc.save(path).unwrap();
    }

    #[tokio::test]
    async fn compress_produces_loadable_output_and_reports_sizes() {
        let dir = tempfile::tempdir().unwrap();
        let input = dir.path().join("in.pdf");
        let output = dir.path().join("out.pdf");
        write_sample_pdf(&input);

        let tool = CompressPdf;
        let args = serde_json::json!({
            "input_path": input.to_str().unwrap(),
            "output_path": output.to_str().unwrap(),
        });
        let out = tool.execute(ToolInput { args }).await.unwrap();

        // 输出文件存在且能被 lopdf 重新加载
        assert!(output.exists());
        lopdf::Document::load(&output).unwrap();
        // 返回了前后大小
        assert!(out.data.get("before_size").is_some());
        assert!(out.data.get("after_size").is_some());
    }

    #[tokio::test]
    async fn compress_missing_input_errors() {
        let tool = CompressPdf;
        let args = serde_json::json!({
            "input_path": "/nonexistent/x.pdf",
            "output_path": "/tmp/out.pdf",
        });
        let err = tool.execute(ToolInput { args }).await.unwrap_err();
        assert!(matches!(err, crate::tools::ToolError::Execution(_) | crate::tools::ToolError::InvalidInput(_)));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml compress_pdf`
Expected: 编译失败（`CompressPdf` 未定义）。

- [ ] **Step 3: 实现 compress_pdf**

在 `src-tauri/src/tools/compress_pdf/mod.rs` 顶部：

```rust
use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

pub struct CompressPdf;

#[derive(Deserialize)]
struct Args {
    input_path: String,
    output_path: String,
}

#[async_trait]
impl Tool for CompressPdf {
    fn id(&self) -> &str {
        "compress_pdf"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "compress_pdf".into(),
            description: "压缩 PDF 文件（无损结构压缩：对象流 + 交叉引用流）。输入 input_path 与 output_path。".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "input_path": { "type": "string", "description": "源 PDF 路径" },
                    "output_path": { "type": "string", "description": "输出 PDF 路径" }
                },
                "required": ["input_path", "output_path"]
            }),
            requires_confirmation: false,
        }
    }

    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;

        let before_size = std::fs::metadata(&args.input_path)
            .map_err(|e| ToolError::Execution(format!("读取源文件失败: {e}")))?
            .len();

        let mut doc = lopdf::Document::load(&args.input_path)
            .map_err(|e| ToolError::Execution(format!("加载 PDF 失败: {e}")))?;

        // 使用 PDF 1.5+ 对象流 + 交叉引用流做无损结构压缩
        doc.save_modern(&args.output_path)
            .map_err(|e| ToolError::Execution(format!("保存压缩 PDF 失败: {e}")))?;

        let after_size = std::fs::metadata(&args.output_path)
            .map_err(|e| ToolError::Execution(format!("读取输出文件失败: {e}")))?
            .len();

        Ok(ToolOutput {
            data: serde_json::json!({
                "output_path": args.output_path,
                "before_size": before_size,
                "after_size": after_size,
            }),
            message: format!("已压缩：{before_size} → {after_size} 字节"),
        })
    }
}
```

注意：若 lopdf 0.40 的 `save_modern` 签名或方法名与此不符，查 `Document` 文档确认（核实来源：crates.io lopdf 0.40 文档明确提到 `save_modern()`）。

- [ ] **Step 4: 在 Task 3 的 `mod.rs` 启用模块并注册**

确认 `src-tauri/src/tools/mod.rs` 顶部有 `pub mod compress_pdf;`（Task 3 已建空文件，此时填充完成）。

- [ ] **Step 5: 运行测试确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml compress_pdf`
Expected: 2 个测试 PASS。

- [ ] **Step 6: 创建 FEATURE.md 并提交**

`src-tauri/src/tools/compress_pdf/FEATURE.md`（现状：已实现 lopdf save_modern 无损压缩；TODO/Risks：图片降采样推迟到阶段三需 pdfium）。

```bash
git add src-tauri/src/tools/compress_pdf/
git commit -m "feat: 实现 compress_pdf 工具（lopdf 无损结构压缩）"
```

---

## Task 5: 通用 Tauri 命令（list_tools / run_tool）

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 编写命令逻辑的失败测试**

在 `src-tauri/src/commands.rs`：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_registry_contains_compress_pdf() {
        let reg = build_registry();
        let ids: Vec<String> = reg.list().into_iter().map(|s| s.id).collect();
        assert!(ids.contains(&"compress_pdf".to_string()));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml build_registry`
Expected: 编译失败（`build_registry` 未定义）。

- [ ] **Step 3: 实现命令与注册表构造**

`src-tauri/src/commands.rs`：

```rust
use crate::tools::{compress_pdf::CompressPdf, ToolInput, ToolOutput, ToolRegistry, ToolSchema};
use tauri::State;

pub fn build_registry() -> ToolRegistry {
    let mut reg = ToolRegistry::new();
    reg.register(Box::new(CompressPdf));
    reg
}

pub struct AppState {
    pub registry: ToolRegistry,
}

#[tauri::command]
pub fn list_tools(state: State<'_, AppState>) -> Vec<ToolSchema> {
    state.registry.list()
}

#[tauri::command]
pub async fn run_tool(
    state: State<'_, AppState>,
    id: String,
    input: ToolInput,
) -> Result<ToolOutput, String> {
    state
        .registry
        .run(&id, input)
        .await
        .map_err(|e| e.to_string())
}
```

`src-tauri/src/lib.rs`（注册命令与状态）：

```rust
mod commands;
mod tools;

use commands::{build_registry, AppState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState { registry: build_registry() })
        .invoke_handler(tauri::generate_handler![
            commands::list_tools,
            commands::run_tool
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml build_registry`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat: 新增 list_tools/run_tool 通用命令并注册工具"
```

---

## Task 6: 前端工具封装 lib/tools.ts

**Files:**
- Create: `src/lib/tools.ts`, `src/lib/tools.test.ts`
- Modify: `package.json`（加 `@tauri-apps/api`）

- [ ] **Step 1: 安装 Tauri API**

Run: `vp install` 后确认 `@tauri-apps/api` 在依赖中；若无则 `vp add @tauri-apps/api`（或编辑 package.json 加 `"@tauri-apps/api": "^2"` 再 `vp install`）。

- [ ] **Step 2: 编写封装的失败测试**

`src/lib/tools.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

import { runTool, listTools } from './tools';

describe('tools 封装', () => {
  beforeEach(() => invokeMock.mockReset());

  it('runTool 透传 id 与 args 给 run_tool', async () => {
    invokeMock.mockResolvedValue({ data: { after_size: 10 }, message: 'ok' });
    const res = await runTool('compress_pdf', { input_path: 'a', output_path: 'b' });
    expect(invokeMock).toHaveBeenCalledWith('run_tool', {
      id: 'compress_pdf',
      input: { args: { input_path: 'a', output_path: 'b' } },
    });
    expect(res.message).toBe('ok');
  });

  it('listTools 调用 list_tools', async () => {
    invokeMock.mockResolvedValue([{ id: 'compress_pdf' }]);
    const tools = await listTools();
    expect(invokeMock).toHaveBeenCalledWith('list_tools');
    expect(tools[0].id).toBe('compress_pdf');
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `vp test src/lib/tools.test.ts`
Expected: FAIL（`./tools` 模块/导出不存在）。

- [ ] **Step 4: 实现封装**

`src/lib/tools.ts`：

```typescript
import { invoke } from '@tauri-apps/api/core';

export interface ToolSchema {
  id: string;
  description: string;
  parameters: Record<string, unknown>;
  requires_confirmation: boolean;
}

export interface ToolOutput {
  data: Record<string, unknown>;
  message: string;
}

export async function listTools(): Promise<ToolSchema[]> {
  return invoke<ToolSchema[]>('list_tools');
}

export async function runTool(
  id: string,
  args: Record<string, unknown>,
): Promise<ToolOutput> {
  return invoke<ToolOutput>('run_tool', { id, input: { args } });
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `vp test src/lib/tools.test.ts`
Expected: 2 个测试 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/lib/tools.ts src/lib/tools.test.ts package.json
git commit -m "feat: 新增前端工具调用统一封装 runTool/listTools"
```

---

## Task 7: PDF 压缩工具页 CompressPdf.vue

**Files:**
- Create: `src/components/tools/compress-pdf/CompressPdf.vue`, `src/components/tools/compress-pdf/CompressPdf.test.ts`, `src/components/tools/compress-pdf/FEATURE.md`

- [ ] **Step 1: 编写组件失败测试**

`src/components/tools/compress-pdf/CompressPdf.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const runToolMock = vi.fn();
vi.mock('../../../lib/tools', () => ({ runTool: runToolMock }));
// 模拟文件选择对话框
const openMock = vi.fn();
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: openMock, save: vi.fn() }));

import CompressPdf from './CompressPdf.vue';

describe('CompressPdf', () => {
  it('选择文件并压缩后展示前后大小', async () => {
    openMock.mockResolvedValueOnce('/tmp/in.pdf');   // 选输入
    runToolMock.mockResolvedValue({
      data: { before_size: 1000, after_size: 400, output_path: '/tmp/out.pdf' },
      message: '已压缩：1000 → 400 字节',
    });

    const wrapper = mount(CompressPdf);
    await wrapper.find('[data-test="pick-file"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-test="compress"]').trigger('click');
    await wrapper.vm.$nextTick();
    await Promise.resolve();

    expect(runToolMock).toHaveBeenCalledWith('compress_pdf', expect.objectContaining({
      input_path: '/tmp/in.pdf',
    }));
    expect(wrapper.text()).toContain('400');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `vp test CompressPdf`
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 实现组件**

`src/components/tools/compress-pdf/CompressPdf.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { runTool } from '../../../lib/tools';

const inputPath = ref<string | null>(null);
const result = ref<{ before: number; after: number; output: string } | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

async function pickFile() {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (typeof selected === 'string') {
    inputPath.value = selected;
    result.value = null;
    error.value = null;
  }
}

async function compress() {
  if (!inputPath.value) return;
  loading.value = true;
  error.value = null;
  try {
    const outputPath = inputPath.value.replace(/\.pdf$/i, '') + '-compressed.pdf';
    const out = await runTool('compress_pdf', {
      input_path: inputPath.value,
      output_path: outputPath,
    });
    result.value = {
      before: out.data.before_size as number,
      after: out.data.after_size as number,
      output: out.data.output_path as string,
    };
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="border rounded p-4 max-w-lg">
    <h2 class="text-lg font-semibold mb-3">PDF 压缩</h2>
    <button data-test="pick-file" class="px-3 py-1 border rounded mr-2" @click="pickFile">
      选择 PDF
    </button>
    <span v-if="inputPath" class="text-sm text-gray-600">{{ inputPath }}</span>

    <div class="mt-3">
      <button
        data-test="compress"
        class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="!inputPath || loading"
        @click="compress"
      >
        {{ loading ? '压缩中…' : '开始压缩' }}
      </button>
    </div>

    <p v-if="error" class="text-red-600 mt-3">{{ error }}</p>
    <div v-if="result" class="mt-3 text-sm">
      <p>压缩前：{{ result.before }} 字节</p>
      <p>压缩后：{{ result.after }} 字节</p>
      <p>输出：{{ result.output }}</p>
    </div>
  </section>
</template>
```

- [ ] **Step 4: 安装 dialog 插件**

Run: `npx tauri add dialog`（添加 `@tauri-apps/plugin-dialog` 与 Rust 端 `tauri-plugin-dialog`，并在 `lib.rs` 的 builder 链上加 `.plugin(tauri_plugin_dialog::init())`）。

- [ ] **Step 5: 运行测试确认通过**

Run: `vp test CompressPdf`
Expected: PASS。

- [ ] **Step 6: 端到端手动验证**

Run: `npx tauri dev`
操作：点"选择 PDF"选一个真实 PDF → 点"开始压缩" → 看到前后大小且生成 `-compressed.pdf`。
Expected: 成功显示前后字节数，输出文件存在。

- [ ] **Step 7: 创建 FEATURE.md 并提交**

`src/components/tools/compress-pdf/FEATURE.md`（现状：UI 可选文件并调用 compress_pdf 展示结果）。

```bash
git add src/components/tools/compress-pdf/ src-tauri/
git commit -m "feat: 新增 PDF 压缩工具页并接通端到端链路"
```

---

## Task 8: FEATURE.md Cursor 规则

**Files:**
- Create: `.cursor/rules/feature-md.mdc`

- [ ] **Step 1: 创建规则文件**

`.cursor/rules/feature-md.mdc`：

```markdown
---
description: 每个功能模块维护 FEATURE.md，作为上下文+日志双用文件
alwaysApply: true
---

# FEATURE.md 约定

- 每个功能/工具目录必须有一个 `FEATURE.md`（上下文 + 日志双用）。
- 动手修改某模块前，先读该目录的 `FEATURE.md` 进入状态。
- 改完后，立即在同一次提交内更新「现状(Status)」与「变更日志(Changelog)」。
- 新建功能模块时，必须同时创建 `FEATURE.md`（至少填写「现状」）。

统一模板：
\`\`\`markdown
# <功能名>
## 现状 (Status)
## 设计意图 (Intent)
## 接口契约 (Interface)
## 变更日志 (Changelog)
- YYYY-MM-DD: ...
## 待办 / 风险 (TODO / Risks)
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add .cursor/rules/feature-md.mdc
git commit -m "chore: 新增 FEATURE.md 工作流的 Cursor 规则"
```

---

## Task 9: CI（GitHub Actions）

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 创建 CI 工作流**

`.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm i -g @vitejs/plus
      - run: vp install
      - run: vp check
      - run: vp test

  rust:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: 安装 Tauri 系统依赖
        run: echo "macOS runner 自带 WebKit"
      - run: cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
      - run: cargo test --manifest-path src-tauri/Cargo.toml
```

- [ ] **Step 2: 本地预跑校验命令**

Run: `vp check && vp test && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml`
Expected: 全部通过（修掉 clippy 警告）。

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 新增前端与 Rust 的 GitHub Actions 流水线"
```

---

## Task 10: mac 安装包打包 + README

**Files:**
- Create: `README.md`
- Modify: `src-tauri/tauri.conf.json`（bundle 配置）

- [ ] **Step 1: 确认 bundle 配置**

`src-tauri/tauri.conf.json` 的 `bundle` 段确保：

```json
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "identifier": "dev.docpilot.app"
  }
}
```

- [ ] **Step 2: 执行打包**

Run: `npx tauri build`
Expected: 在 `src-tauri/target/release/bundle/` 下生成 `.app` 与 `.dmg`。

- [ ] **Step 3: 验证安装包可启动**

打开 `src-tauri/target/release/bundle/dmg/*.dmg` 安装并启动，验证能选 PDF 并压缩。

- [ ] **Step 4: 编写 README**

`README.md` 内容包含：项目简介、技术栈、开发命令（`vp dev` / `npx tauri dev` / `npx tauri build`）、`vp` 安装说明、FEATURE.md 约定说明、阶段路线图链接到架构 spec。

- [ ] **Step 5: Commit**

```bash
git add README.md src-tauri/tauri.conf.json
git commit -m "build: 配置 mac 安装包打包并补充 README"
```

---

## Self-Review（计划自审）

**1. Spec coverage（对照架构 spec 阶段一交付标准）：**
- monorepo + Vite+ + Tauri2 骨架 → Task 1, 2 ✓
- Tool trait + ToolRegistry + list_tools/run_tool → Task 3, 5 ✓
- compress_pdf（Rust，lopdf 路线）→ Task 4 ✓
- UI 工具页（选文件/档位/压缩/前后大小）→ Task 7 ✓（注：档位/level 简化为单一无损压缩，符合"最小可用"，多档位推迟）
- mac dev 跑通 + mac 安装包 → Task 7 Step 6, Task 10 ✓
- CI 骨架（Rust + 前端测试）→ Task 9 ✓
- FEATURE.md 约定 + Cursor rule → 各 Task 的 FEATURE.md + Task 8 ✓
- 全面测试基线（Rust 单测 + TS 单测 + 组件测试）→ Task 3/4/5/6/7 ✓（E2E Playwright 按 spec 属阶段性增长，本阶段以手动端到端验证 + 组件测试覆盖，E2E 框架接入可作为收尾可选项）

**2. Placeholder scan：** 无 TBD/TODO 残留；每个代码步骤含完整代码。lopdf `save_modern` 已加"若签名不符则查文档"提示，因属外部库版本不确定性，非占位符。

**3. Type consistency：** `ToolInput{args}`、`ToolOutput{data,message}`、`ToolSchema{id,description,parameters,requires_confirmation}` 在 Rust（Task 3）、命令（Task 5）、前端封装（Task 6）、组件（Task 7）中保持一致；`run_tool` 入参 `{id, input:{args}}` 在 Rust 命令与前端封装、组件测试三处一致。

**已知偏差（合理收敛，符合"最小可用"）：**
- 压缩"档位"先不做，仅做 lopdf 无损结构压缩（多档位/图片降采样属阶段三）。
- E2E（Playwright/WebDriver）框架本阶段以手动端到端 + 组件测试替代，避免拖慢第一步；正式接入可在阶段一收尾或阶段二补。
