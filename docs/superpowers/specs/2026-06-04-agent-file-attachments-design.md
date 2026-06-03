# Agent 文件/文件夹附件 — 设计说明

## 目标

AI 智能体对话支持发送前附加本地文件或文件夹（展开为路径列表），并在工具执行前对缺失/无效的输入路径弹出系统选择器。

## 决策摘要

- **主流程 (A)**：输入区添加文件/文件夹，结构化 `attachments`，合成模型可读路径块。
- **补充 (B)**：`execute` 前解析 `input_path` / `input_paths` / `path` / `src`；空或不存在则 `open` 对话框。
- **文件夹**：一层目录扫描，默认扩展名 pdf + 常见图片；0 匹配仍附带目录说明。
- **不传云端**：仅本地绝对路径，与现有 `run_tool` 一致。

## 架构

- `src/agent/attachments.ts` — 类型与 `formatUserMessageForModel`
- `src/agent/filePicker.ts` — Agent 专用 dialog 封装
- `src/agent/pathResolve.ts` — 工具参数路径补全
- `src/composables/useAgentAttachments.ts` — 待发送附件状态
- Rust `list_files_in_dir` / `path_exists` 命令
- `AgentChat.vue` + `useAgentChat.ts` 集成

## 变更日志

- 2026-06-04: 初版 spec（brainstorming 批准，用户要求实现至完成）
