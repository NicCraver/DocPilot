# macOS DMG 安装引导

## 现状 (Status)

- Release 构建在 `tauri build`（仅 `app` bundle）后，由 `scripts/postprocess-dmg.mjs` 调用 `create-dmg` 生成最终 `.dmg`。
- DMG 内含：`DocPilot.app`、「应用程序」快捷方式、`解除隔离.command`（双击打开终端并执行 `xattr -d com.apple.quarantine`）。
- 背景图 `background.png` 由 `scripts/generate-dmg-background.mjs` 按 DocPilot 配色（`#2563EB` / `#F8FAFC`）生成，含三步中文引导。
- 图标坐标：App `(130,230)`、应用程序 `(330,230)`、解除隔离 `(530,230)`；窗口 `660×440`。

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

## 待办 / 风险 (TODO / Risks)

- Tauri 原生 DMG 与 create-dmg 双路径：开发 `tauri:build:dev` 仍走 Tauri 默认 DMG，无解除隔离脚本；仅 Release 流水线使用 postprocess。
- 背景图 DPI：当前 660×440 逻辑像素；高 DPI 屏可能略糊（见 tauri-apps/tauri#12009）。
- 未公证构建仍可能需要「右键 → 打开」；脚本仅处理 `com.apple.quarantine`。
