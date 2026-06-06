#!/usr/bin/env node
/**
 * 检测 LibreOffice（soffice）是否可用，用于 word-smart-doc 缩略图渲染。
 * 缺失时给出各平台安装指引；不强制安装，调用方可降级为文本占位。
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const CANDIDATES = [
  "soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  "/usr/bin/soffice",
  "/usr/local/bin/soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
];

function findSoffice() {
  for (const c of CANDIDATES) {
    if (c.includes("/") || c.includes("\\")) {
      if (existsSync(c)) return c;
      continue;
    }
    const r = spawnSync(c, ["--version"], { encoding: "utf-8" });
    if (r.status === 0) return c;
  }
  return null;
}

const found = findSoffice();
if (found) {
  console.log(`LibreOffice 已就绪: ${found}`);
  process.exit(0);
}

console.warn("未检测到 LibreOffice，缩略图将降级为文本占位。");
console.warn("安装指引：");
console.warn("  macOS:  brew install --cask libreoffice");
console.warn("  Ubuntu: sudo apt-get install -y libreoffice");
console.warn("  Windows: https://www.libreoffice.org/download/");
process.exit(0);
