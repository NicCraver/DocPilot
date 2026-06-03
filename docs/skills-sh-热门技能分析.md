# skills.sh 热门技能分析（Tauri2 / Rust / Python）

> **数据来源**：[skills.sh](https://www.skills.sh/) 搜索 API（`GET /api/search?q=`）  
> **筛选条件**：安装量 **≥ 1,000**（2026-06-03 抓取）  
> **说明**：`tauri2` 关键词下无满足条件的 skill；Tauri 相关以 `tauri` 搜索命中项为准。

---

## 1. 总览

| 搜索词   | API 返回数 | ≥1000 条数 | 说明                                    |
| -------- | ---------- | ---------- | --------------------------------------- |
| `tauri2` | 1          | **0**      | 仅 `tauri2-mobile`（29 次安装），未纳入 |
| `tauri`  | 76         | **1**      | 见下文 Tauri 章节                       |
| `rust`   | 100        | **10**     | Rust 专项与工程实践                     |
| `python` | 100        | **30**     | 含 MCP、Dataverse、工程化等             |

**合计：41 个热门 skill**（去重后唯一 ID）

**安装命令格式**（站点统一）：

```bash
npx skills add https://github.com/<owner>/<repo> --skill <skill-id>
```

**技能页**：`https://www.skills.sh/<owner>/<repo>/<skill-id>`

---

## 2. Tauri / Tauri2

### 2.1 Tauri2（≥1000）

无。若做 Tauri 2 移动端，目前仅有：

| Skill                                                                              | 安装量 | 能力概要                                                          |
| ---------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| [tauri2-mobile](https://www.skills.sh/acaprino/alfio-claude-plugins/tauri2-mobile) | 29     | Alfio 插件生态中的 Tauri 2 移动端 skill（未达热门阈值，仅作参考） |

### 2.2 Tauri（≥1000）— 推荐首选

| Skill                                                                               | 安装量    | 来源仓库                               | 核心能力                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | --------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[tauri-v2](https://www.skills.sh/nodnarbnitram/claude-code-extensions/tauri-v2)** | **4,889** | `nodnarbnitram/claude-code-extensions` | **Tauri v2+ 全栈桌面/移动端**：`tauri.conf.json`、Rust `#[tauri::command]`、IPC（`invoke` / `emit` / channels）、permissions / capabilities、构建排错与发布。宣称可预防 8+ 常见错误（权限缺失、命令未注册、State 类型不匹配等），并提供配置与 IPC 速查。 |

**触发场景（官方 description）**：出现 Tauri、`src-tauri`、`invoke`、`emit`、`capabilities.json` 等即应启用。

**典型工作流**：

1. 定义 Rust command → 在 `generate_handler!` 注册
2. 前端 `invoke` 调用
3. 在 capabilities 中声明权限

**Never Do（文档强调）**：生产环境滥用 `unwrap`、漏配 capability、命令未注册仍调用等。

---

## 3. Rust（≥1000，共 10 个）

按安装量降序。

### 3.1 通用工程与模式

| Skill                                                                                               | 安装量 | 能力分析                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [rust-async-patterns](https://www.skills.sh/wshobson/agents/rust-async-patterns)                    | 13,516 | **异步 Rust**：Tokio/async 模式、并发与 I/O 场景的最佳实践（wshobson/agents 插件体系）。                                                       |
| [rust-best-practices](https://www.skills.sh/apollographql/skills/rust-best-practices)               | 11,060 | **Apollo Rust 规范手册**：所有权/借用、错误处理、性能、Clippy、测试、泛型与分发、Type State、文档等；引用 `references/chapter_*.md` 分章审查。 |
| [rust-mcp-server-generator](https://www.skills.sh/github/awesome-copilot/rust-mcp-server-generator) | 8,735  | **用 Rust 生成 MCP Server**：基于官方 `rmcp` SDK，生成含 tools/prompts/resources/测试的完整 Cargo 工程（stdio/SSE/HTTP 传输可选）。            |
| [m15-anti-pattern](https://www.skills.sh/zhanghandong/rust-skills/m15-anti-pattern)                 | 5,450  | **反模式审查**：`.clone()` 滥用、`unwrap`、错误所有权设计等；中英关键词触发，可串联其他 rust-skills 模块。                                     |
| [rust-testing](https://www.skills.sh/affaan-m/everything-claude-code/rust-testing)                  | 4,313  | **测试体系**：单元/集成/异步测试、属性测试、mock、覆盖率；强调 TDD（RED-GREEN-REFACTOR）。                                                     |
| [rust-patterns](https://www.skills.sh/affaan-m/everything-claude-code/rust-patterns)                | 4,114  | **惯用 Rust**：所有权、`thiserror`/`anyhow`、`Option` 组合子、枚举建模非法状态、trait/泛型设计。                                               |
| [rust-engineer](https://www.skills.sh/jeffallan/claude-skills/rust-engineer)                        | 3,654  | **「Rust 工程师」角色 skill**：分析所有权、设计 trait 层次、Tokio 异步、FFI、性能优化；含 MUST DO / MUST NOT 与验证命令模板。                  |
| [rust-skills](https://www.skills.sh/leonardomso/rust-skills/rust-skills)                            | 1,312  | leonardomso 出品的综合 Rust skill 包入口（与 zhanghandong 系列不同源）。                                                                       |
| [coding-guidelines](https://www.skills.sh/zhanghandong/rust-skills/coding-guidelines)               | 1,179  | **50 条核心规范**：命名（无 `get_` 前缀、`as_`/`to_`/`into_`）、类型、字符串、错误、内存、并发、async、宏；含 Clippy/rustfmt 导向。            |

### 3.2 与 Tauri 栈的协同

做 **Tauri 2 + Rust 后端** 时建议组合：

1. `nodnarbnitram/.../tauri-v2` — 框架与 IPC/权限
2. `apollographql/.../rust-best-practices` 或 `affaan-m/.../rust-patterns` — 后端代码质量
3. `affaan-m/.../rust-testing` — 命令与核心逻辑测试
4. 若做 MCP sidecar：`github/awesome-copilot/rust-mcp-server-generator`

---

## 4. Python（≥1000，共 30 个）

### 4.1 wshobson/agents — Python 工程化套件（15 个，均 ≥6,749）

同一仓库下的细分 skill，名称即职责边界：

| Skill                           | 安装量 | 能力分析                 |
| ------------------------------- | ------ | ------------------------ |
| python-performance-optimization | 24,910 | 性能分析与优化策略       |
| python-testing-patterns         | 22,667 | 测试模式与 pytest 等实践 |
| python-design-patterns          | 12,853 | 设计模式与架构           |
| async-python-patterns           | 11,428 | asyncio 与异步 I/O       |
| python-code-style               | 9,116  | 代码风格与可读性         |
| python-project-structure        | 8,496  | 项目/layout 组织         |
| python-packaging                | 8,285  | 打包与发布               |
| python-error-handling           | 8,063  | 异常与错误传播           |
| python-anti-patterns            | 7,805  | 反模式规避               |
| python-type-safety              | 7,556  | 类型注解与静态检查       |
| temporal-python-testing         | 7,109  | Temporal 工作流测试      |
| python-configuration            | 7,103  | 配置管理                 |
| python-observability            | 7,086  | 日志/指标/追踪           |
| python-resilience               | 6,875  | 重试、熔断等韧性模式     |
| python-background-jobs          | 6,865  | 后台任务                 |
| python-resource-management      | 6,749  | 资源生命周期与上下文管理 |

> **说明**：wshobson 仓库采用 plugins 目录结构，批量抓取时路径与 `main/<skill>/SKILL.md` 不一致；上表能力由 **skill 命名 + 仓库定位** 归纳，安装后以本地 `SKILL.md` 为准。

### 4.2 github/awesome-copilot — 生成器与企业集成（7 个）

| Skill                              | 安装量 | 能力分析                                                                                           |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| python-mcp-server-generator        | 9,571  | **Python MCP 脚手架**：uv 项目、`mcp[cli]`、stdio/streamable-http、工具实现与错误处理模板          |
| dataverse-python-production-code   | 9,308  | **Dataverse 生产级代码**：`DataverseError` 层次、单例 client、429 退避、OData 优化、日志与类型注解 |
| dataverse-python-advanced-patterns | 8,837  | 批量操作、元数据表、高级 OData、超时配置                                                           |
| dataverse-python-quickstart        | 8,490  | SDK 安装、认证、CRUD、批量、分页片段                                                               |
| dataverse-python-usecase-builder   | 8,459  | 从业务需求到表结构、模式选型、完整实现模板                                                         |
| rust-mcp-server-generator          | 8,735  | （见 Rust 节，Copilot 仓库亦含 Rust 向 MCP）                                                       |
| aws-cdk-python-setup               | 1,405  | **AWS CDK Python**：环境、venv、`cdk deploy` 工作流                                                |

### 4.3 框架 / 角色 / 垂直场景

| Skill                                                                                        | 安装量 | 能力分析                                                                        |
| -------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| [fastapi-python](https://www.skills.sh/mindrally/skills/fastapi-python)                      | 9,603  | FastAPI 路由、依赖注入、异步、Pydantic、性能与错误处理                          |
| [python-patterns](https://www.skills.sh/affaan-m/everything-claude-code/python-patterns)     | 6,053  | PEP 8、类型注解、EAFP、可读性与重构                                             |
| [modern-python](https://www.skills.sh/trailofbits/skills/modern-python)                      | 4,663  | Trail of Bits 现代 Python 实践（安全/工程向）                                   |
| [python-expert](https://www.skills.sh/shubhamsaboo/awesome-llm-apps/python-expert)           | 3,446  | LLM 应用方向的 Python 专家 skill                                                |
| [python-pro](https://www.skills.sh/jeffallan/claude-skills/python-pro)                       | 3,322  | Python 3.11+、strict mypy、pytest、black/ruff                                   |
| [n8n-code-python](https://www.skills.sh/czlonkowski/n8n-skills/n8n-code-python)              | 2,484  | **n8n Code 节点 Python（Beta）**；默认仍推荐 JS，仅在有 Python 标准库需求时使用 |
| [python-backend](https://www.skills.sh/jiatastic/open-python-skills/python-backend)          | 1,522  | 后端项目结构与 API 实践（open-python-skills）                                   |
| [python-best-practices](https://www.skills.sh/0xbigboss/claude-code/python-best-practices)   | 1,511  | 不可变 dataclass、结构化日志、`ty`、pyproject 约定                              |
| [aws-sdk-python-usage](https://www.skills.sh/aws/agent-toolkit-for-aws/aws-sdk-python-usage) | 1,173  | AWS SDK for Python 使用模式（官方 toolkit）                                     |

---

## 5. 按来源仓库分组（便于批量安装）

| 仓库                                     | 热门 skill 数            | 特点                                         |
| ---------------------------------------- | ------------------------ | -------------------------------------------- |
| **wshobson/agents**                      | 16（含 1 个 Rust async） | 最完整的 Python/Rust 工程化插件集            |
| **github/awesome-copilot**               | 7                        | MCP 生成器 + Microsoft Dataverse + AWS CDK   |
| **affaan-m/everything-claude-code**      | 3                        | Rust/Python 模式 + 测试                      |
| **zhanghandong/rust-skills**             | 2                        | 模块化 Rust 规范（anti-pattern、guidelines） |
| **jeffallan/claude-skills**              | 2                        | `rust-engineer`、`python-pro` 角色型         |
| **nodnarbnitram/claude-code-extensions** | 1                        | **Tauri v2 首选**                            |
| **mindrally/skills**                     | 1                        | FastAPI                                      |
| **apollographql/skills**                 | 1                        | Rust 最佳实践手册                            |
| 其他                                     | 各 1                     | trailofbits、czlonkowski、0xbigboss、aws 等  |

---

## 6. 选型建议（DocPilot / 桌面 + 后端场景）

### 6.1 技术栈：Tauri 2 + Rust + Python（sidecar/脚本）

| 优先级 | Skill                                                       | 理由                                    |
| ------ | ----------------------------------------------------------- | --------------------------------------- |
| P0     | `tauri-v2`                                                  | 唯一热门 Tauri v2 专项，覆盖 IPC 与权限 |
| P0     | `rust-patterns` + `rust-testing`                            | 后端命令与业务逻辑质量                  |
| P1     | `rust-best-practices` 或 `coding-guidelines`                | 代码审查与规范                          |
| P1     | `python-pro` 或 `python-patterns`                           | 若 Python 负责脚本/ML/数据处理          |
| P2     | `rust-mcp-server-generator` / `python-mcp-server-generator` | 需要 MCP 工具链时                       |

### 6.2 纯 Python 后端 / API

| 场景               | 推荐                                                              |
| ------------------ | ----------------------------------------------------------------- |
| FastAPI 服务       | `fastapi-python`                                                  |
| 工程化全套         | wshobson 的 `python-*` 系列（按需选 3～5 个，避免一次装太多重叠） |
| 类型与安全         | `python-pro` + `python-type-safety`                               |
| Microsoft 数据平台 | awesome-copilot 的 `dataverse-python-*` 四件套                    |

### 6.3 不建议因「热门」而安装的

- **与栈无关的垂直 skill**：如仅 n8n 场景才需要 `n8n-code-python`
- **tauri2-mobile**（<1000）：除非明确做 Alfio 相关移动端

---

## 7. 附录：41 个热门 skill 完整列表

| #   | 安装量 | Skill ID                                                  | 分类   |
| --- | ------ | --------------------------------------------------------- | ------ |
| 1   | 24910  | wshobson/agents/python-performance-optimization           | python |
| 2   | 22667  | wshobson/agents/python-testing-patterns                   | python |
| 3   | 13516  | wshobson/agents/rust-async-patterns                       | rust   |
| 4   | 12853  | wshobson/agents/python-design-patterns                    | python |
| 5   | 11428  | wshobson/agents/async-python-patterns                     | python |
| 6   | 11060  | apollographql/skills/rust-best-practices                  | rust   |
| 7   | 9603   | mindrally/skills/fastapi-python                           | python |
| 8   | 9571   | github/awesome-copilot/python-mcp-server-generator        | python |
| 9   | 9308   | github/awesome-copilot/dataverse-python-production-code   | python |
| 10  | 9116   | wshobson/agents/python-code-style                         | python |
| 11  | 8837   | github/awesome-copilot/dataverse-python-advanced-patterns | python |
| 12  | 8735   | github/awesome-copilot/rust-mcp-server-generator          | rust   |
| 13  | 8496   | wshobson/agents/python-project-structure                  | python |
| 14  | 8490   | github/awesome-copilot/dataverse-python-quickstart        | python |
| 15  | 8459   | github/awesome-copilot/dataverse-python-usecase-builder   | python |
| 16  | 8285   | wshobson/agents/python-packaging                          | python |
| 17  | 8063   | wshobson/agents/python-error-handling                     | python |
| 18  | 7805   | wshobson/agents/python-anti-patterns                      | python |
| 19  | 7556   | wshobson/agents/python-type-safety                        | python |
| 20  | 7109   | wshobson/agents/temporal-python-testing                   | python |
| 21  | 7103   | wshobson/agents/python-configuration                      | python |
| 22  | 7086   | wshobson/agents/python-observability                      | python |
| 23  | 6875   | wshobson/agents/python-resilience                         | python |
| 24  | 6865   | wshobson/agents/python-background-jobs                    | python |
| 25  | 6749   | wshobson/agents/python-resource-management                | python |
| 26  | 6053   | affaan-m/everything-claude-code/python-patterns           | python |
| 27  | 5450   | zhanghandong/rust-skills/m15-anti-pattern                 | rust   |
| 28  | 4889   | nodnarbnitram/claude-code-extensions/tauri-v2             | tauri  |
| 29  | 4663   | trailofbits/skills/modern-python                          | python |
| 30  | 4313   | affaan-m/everything-claude-code/rust-testing              | rust   |
| 31  | 4114   | affaan-m/everything-claude-code/rust-patterns             | rust   |
| 32  | 3654   | jeffallan/claude-skills/rust-engineer                     | rust   |
| 33  | 3446   | shubhamsaboo/awesome-llm-apps/python-expert               | python |
| 34  | 3322   | jeffallan/claude-skills/python-pro                        | python |
| 35  | 2484   | czlonkowski/n8n-skills/n8n-code-python                    | python |
| 36  | 1522   | jiatastic/open-python-skills/python-backend               | python |
| 37  | 1511   | 0xbigboss/claude-code/python-best-practices               | python |
| 38  | 1405   | github/awesome-copilot/aws-cdk-python-setup               | python |
| 39  | 1312   | leonardomso/rust-skills/rust-skills                       | rust   |
| 40  | 1179   | zhanghandong/rust-skills/coding-guidelines                | rust   |
| 41  | 1173   | aws/agent-toolkit-for-aws/aws-sdk-python-usage            | python |

---

## 8. 检索方法（复现）

```bash
# 示例：Rust 热门列表
curl -s 'https://www.skills.sh/api/search?q=rust' | \
  python3 -c "import json,sys; d=json.load(sys.stdin); \
  [print(s['installs'], s['id']) for s in d['skills'] if s['installs']>=1000]"
```

---

_文档生成：Cursor Agent · 筛选阈值 installs ≥ 1000_
