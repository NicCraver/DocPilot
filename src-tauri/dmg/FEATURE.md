# macOS DMG 安装引导

## 现状 (Status)

- Release 构建在 `tauri build`（仅 `app` bundle）后，由 `scripts/postprocess-dmg.mjs` 调用 `create-dmg` 生成最终 `.dmg`。
- DMG 内含：`DocPilot.app`、「应用程序」快捷方式、`解除隔离.command`（双击打开终端并执行 `xattr -d com.apple.quarantine`）。
- 背景图 `background.png` 由 `scripts/generate-dmg-background.mjs` 生成：逻辑窗口 `660×440` pt，输出 `1320×880` px @144dpi（Retina @2x），含三步中文引导。
- 图标坐标：App `(130,230)`、应用程序 `(330,230)`、解除隔离 `(530,230)`；`create-dmg --window-size` 仍为 `660×440` pt。

## 设计意图 (Intent)

从 GitHub Release 下载的 `.dmg` 常被 Gatekeeper 打上隔离属性，用户看到「已损坏」提示。在 DMG 内提供一键脚本 + 图示引导，降低手动敲终端命令的门槛。

## 接口契约 (Interface)

| 输入 | 输出 |
|------|------|
| `src-tauri/target/release/bundle/macos/DocPilot.app` | `src-tauri/target/release/bundle/dmg/DocPilot.dmg` |
| `src-tauri/dmg/remove-quarantine.command` | 复制为 DMG 内 `解除隔离.command`（可执行） |
| `brew install create-dmg` | postprocess 脚本依赖 |

`pnpm run tauri:build`（macOS）在 `tauri build` 成功后自动调用 `postprocess-dmg.mjs`。

## 变更日志 (Changelog)

- 2026-06-05: 初版 — create-dmg 后处理、引导背景图、解除隔离 `.command`、CI 安装 create-dmg。
- 2026-06-05: 背景图改为 1320×880 @144dpi，修复 Retina 屏提示文字发糊；副文案最小字号 10→11pt。

## 待办 / 风险 (TODO / Risks)

- Tauri 原生 DMG 与 create-dmg 双路径：开发 `tauri:build:dev` 仍走 Tauri 默认 DMG，无解除隔离脚本；仅 Release 流水线使用 postprocess。
- 非 macOS 环境生成背景图时 `sips` 不可用，需在本机 macOS 重新执行 `pnpm dmg:background` 以写入 144dpi 元数据。
- 未公证构建仍可能需要「右键 → 打开」；脚本仅处理 `com.apple.quarantine`。
