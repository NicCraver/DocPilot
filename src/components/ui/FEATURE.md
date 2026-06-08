# 共享 UI 组件

## 现状 (Status)

`src/components/ui/` 提供设计令牌驱动的可复用组件：`AppButton`、`AppCard`、`AppBadge`、`AppNavItem`、`AppInput`。全局 CSS 变量定义于 `src/styles/app.css`（Geist 字体、冷灰单强调色、圆角、着色阴影）。主壳 `App.vue`、工具箱、聊天、设置页已接入。

## 设计意图 (Intent)

对齐 taste-skill / Linear·Craft 极简：桌面文档工具、Geist + 靛紫单强调色 + 冷灰背景、导航选中为中性内凹面板（无左侧色条）、可访问焦点环、`prefers-reduced-motion` 降级。

## 接口契约 (Interface)

- 颜色/圆角：CSS 变量 `--dp-*`
- 按钮：`variant` primary | secondary | ghost | danger；`size` sm | md | lg
- 输入：`v-model` + 原生 `type` / `placeholder`；`class` 通过 attrs 合并

## 变更日志 (Changelog)

- 2026-06-08: AppNavItem 选中态改为中性内凹面板（`--dp-bg` + inset 描边），去除左侧主色指示条与紫色底。
- 2026-06-08: AppBadge 去除 pulse 动画（顶栏状态改为静态指示点）；全局令牌增排版阶梯、工具色、轻阴影与 textarea 焦点环。
- 2026-06-08: taste-skill 视觉升级：Inter→Geist、`--dp-*` 冷灰靛紫令牌、AppNavItem 左指示条、AppBadge 方角语义色、`dp-label` 分组样式。
- 2026-06-05: 修复 UnoCSS `presetIcons` 的 Lucide 集合配置（改为函数返回 IconifyJSON），恢复 `i-lucide-*` 图标显示。
- 2026-06-04: 初版 UI 套件与全局样式，替换散落 Tailwind 硬编码。

## 待办 / 风险 (TODO / Risks)

- 暗色模式尚未实现（变量已预留扩展空间）。
