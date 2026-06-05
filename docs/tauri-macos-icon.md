# Tauri macOS Dock 图标排障记录

- 日期：2026-06-04
- 范围：`src-tauri` 图标资源、macOS Dock 显示、Tauri dev 重编译

## 问题现象

macOS Dock 中的 DocPilot 图标出现过两类异常：

1. 图标四角/外圈出现黑底或异常底色。
2. 图标比其他 Dock 图标视觉上大一圈，像被放在一个浅色方块里。

## 根因

源图 `src-tauri/app-icon-source.png` 是无透明通道图片，四角黑色来自导出背景。如果直接生成 Tauri 图标，黑底会进入 `.icns`。

第一次修复时为了消除黑角，把整张 `1024x1024` 画布 `flatten` 成不透明浅蓝底。这样虽然黑角没了，但 Dock 会把整块方形实底都当成图标内容，导致视觉尺寸比其他图标大。

正确做法是：

- 只从源图四角 flood fill 清理外侧黑/白底。
- 保留 `1024x1024` 画布外围透明留白。
- 不要对整张最终画布 `flatten`。
- 生成 `.icns` 后验证四角 alpha 应为 `0`。

## 当前实现

图标生成脚本在 `scripts/prepare-app-icon.mjs`：

- 输入源图：`src-tauri/app-icon-source.png`
- 中间主图：`src-tauri/app-icon.png`
- macOS 图标：`src-tauri/icons/icon.icns`
- 关键安全区：`MAC_SAFE = 824`

`package.json` 使用：

```bash
pnpm icons:build
```

脚本会执行：

```bash
node scripts/prepare-app-icon.mjs
tauri icon src-tauri/app-icon.png -o src-tauri/icons
node scripts/prepare-app-icon.mjs --icns-only
```

这里使用本地 `tauri` CLI，不使用 `npx tauri icon`，避免 pnpm 在脚本中触发额外安装/构建检查。

## 验证方法

检查 PNG 四角是否透明：

```bash
node --input-type=module -e 'import sharp from "sharp"; const files=["src-tauri/app-icon.png","src-tauri/icons/icon.png","src-tauri/icons/128x128.png"]; for (const file of files) { const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}); const corners=[[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]].map(([x,y])=>{const i=(y*info.width+x)*info.channels; return Array.from(data.slice(i,i+4)).join(",")}); console.log(`${file}: ${info.width}x${info.height}, corners=${corners.join(" | ")}`); }'
```

期望输出中的四角都是：

```text
0,0,0,0
```

检查 `.icns` 四角是否透明：

```bash
rm -rf /tmp/docpilot-iconset.iconset
iconutil -c iconset "src-tauri/icons/icon.icns" -o /tmp/docpilot-iconset.iconset
node --input-type=module -e 'import sharp from "sharp"; const file="/tmp/docpilot-iconset.iconset/icon_512x512@2x.png"; const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}); const corners=[[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]].map(([x,y])=>{const i=(y*info.width+x)*info.channels; return Array.from(data.slice(i,i+4)).join(",")}); console.log(`${info.width}x${info.height}, corners=${corners.join(" | ")}`);'
```

期望输出：

```text
1024x1024, corners=0,0,0,0 | 0,0,0,0 | 0,0,0,0 | 0,0,0,0
```

## 重新运行应用

图标资源变更后，`tauri dev` 可能不会自动重新嵌入图标。需要清理 `docpilot` 构建产物再启动：

```bash
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
pkill -f "[t]arget/debug/docpilot" 2>/dev/null || true
pkill -f "[t]auri dev" 2>/dev/null || true
(cd src-tauri && cargo clean -p docpilot)
./node_modules/.bin/tauri dev
```

如果 Dock 仍显示旧图标，通常是 macOS Dock 或 LaunchServices 缓存。可尝试：

```bash
killall Dock
```

或者将旧图标从 Dock 移除，再重新打开应用。

## 注意事项

- 不要把最终 `1024x1024` 画布铺成实底，否则 Dock 视觉尺寸会变大。
- 不要只看 `src-tauri/icons/icon.png`，macOS Dock 主要读取 `.icns` 或 dev 二进制中嵌入的资源。
- 每次改图标后都要重新生成图标并重新编译 Tauri dev 二进制。
- `ReadFile` 预览透明 PNG 时可能显示成黑底，这只是预览背景，不代表 PNG 真有黑底；以 alpha 像素检查为准。
