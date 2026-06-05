#!/usr/bin/env node
/**
 * 生成 DocPilot DMG 安装引导背景图（660×440，与 create-dmg 窗口尺寸一致）
 */
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "src-tauri/dmg");
const OUT_FILE = path.join(OUT_DIR, "background.png");

const W = 660;
const H = 440;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#ecf4ff"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.06"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="56" fill="#ffffff" opacity="0.72"/>
  <line x1="0" y1="56" x2="${W}" y2="56" stroke="#e2e8f0" stroke-width="1"/>

  <!-- 标题 -->
  <circle cx="36" cy="28" r="14" fill="#2563eb"/>
  <text x="36" y="33" text-anchor="middle" font-family="PingFang SC, Helvetica Neue, Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">D</text>
  <text x="60" y="24" font-family="PingFang SC, Helvetica Neue, Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">安装 DocPilot</text>
  <text x="60" y="42" font-family="PingFang SC, Helvetica Neue, Arial, sans-serif" font-size="11" fill="#64748b">按下面三步完成安装并解除隔离</text>

  <!-- 步骤条 -->
  <g font-family="PingFang SC, Helvetica Neue, Arial, sans-serif">
    <rect x="40" y="72" width="180" height="52" rx="10" fill="#ffffff" filter="url(#shadow)"/>
    <circle cx="58" cy="98" r="12" fill="#2563eb"/>
    <text x="58" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">1</text>
    <text x="78" y="94" font-size="12" font-weight="600" fill="#0f172a">拖到「应用程序」</text>
    <text x="78" y="110" font-size="10" fill="#64748b">将左侧图标拖入文件夹</text>

    <rect x="240" y="72" width="180" height="52" rx="10" fill="#ffffff" filter="url(#shadow)"/>
    <circle cx="258" cy="98" r="12" fill="#2563eb"/>
    <text x="258" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">2</text>
    <text x="278" y="94" font-size="12" font-weight="600" fill="#0f172a">双击「解除隔离」</text>
    <text x="278" y="110" font-size="10" fill="#64748b">终端会自动执行命令</text>

    <rect x="440" y="72" width="180" height="52" rx="10" fill="#ffffff" filter="url(#shadow)"/>
    <circle cx="458" cy="98" r="12" fill="#2563eb"/>
    <text x="458" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">3</text>
    <text x="478" y="94" font-size="12" font-weight="600" fill="#0f172a">打开 DocPilot</text>
    <text x="478" y="110" font-size="10" fill="#64748b">从启动台或应用程序打开</text>
  </g>

  <!-- 箭头 1 → 2 -->
  <path d="M 218 98 L 236 98" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
  <path d="M 232 94 L 240 98 L 232 102" fill="#2563eb"/>

  <!-- 箭头 2 → 3 -->
  <path d="M 418 98 L 436 98" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
  <path d="M 432 94 L 440 98 L 432 102" fill="#2563eb"/>

  <!-- 图标区引导箭头（拖到应用程序） -->
  <path d="M 200 168 Q 265 148 330 168" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/>
  <path d="M 322 162 L 330 168 L 324 174" fill="#94a3b8"/>
  <text x="265" y="142" text-anchor="middle" font-family="PingFang SC, Helvetica Neue, Arial, sans-serif" font-size="10" fill="#64748b">拖到这里</text>

  <!-- 图标占位虚线框（仅视觉引导，实际图标由 create-dmg 放置） -->
  <rect x="88" y="188" width="84" height="84" rx="14" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 3"/>
  <rect x="288" y="188" width="84" height="84" rx="14" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 3"/>
  <rect x="488" y="188" width="84" height="84" rx="14" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 3"/>

  <!-- 底部提示 -->
  <rect x="120" y="400" width="420" height="28" rx="8" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="330" y="419" text-anchor="middle" font-family="PingFang SC, Helvetica Neue, Arial, sans-serif" font-size="11" fill="#1d4ed8">
    若提示「已损坏」：先完成步骤 2，再右键应用 → 打开
  </text>
</svg>`;

await mkdir(OUT_DIR, { recursive: true });
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile(OUT_FILE, png);
console.log(`已生成 DMG 背景图：${OUT_FILE}`);
