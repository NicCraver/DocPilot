# 共享 UI 组件

## 现状 (Status)

`src/components/ui/` 提供设计令牌驱动的可复用组件：`AppButton`、`AppCard`、`AppBadge`、`AppNavItem`、`AppInput`。全局 CSS 变量定义于 `src/styles/app.css`（Inter 字体、语义色、圆角、阴影）。主壳 `App.vue`、工具箱、聊天、设置页已接入。

## 设计意图 (Intent)

对齐 ui-ux-pro-max 设计系统：文档工具类产品、Inter + 蓝主色 + 浅灰背景、可访问焦点环、`prefers-reduced-motion` 降级。

## 接口契约 (Interface)

- 颜色/圆角：CSS 变量 `--dp-*`
- 按钮：`variant` primary | secondary | ghost | danger；`size` sm | md | lg
- 输入：`v-model` + 原生 `type` / `placeholder`；`class` 通过 attrs 合并

## 变更日志 (Changelog)

- 2026-06-04: 初版 UI 套件与全局样式，替换散落 Tailwind 硬编码。

## 待办 / 风险 (TODO / Risks)

- 暗色模式尚未实现（变量已预留扩展空间）。
