#!/usr/bin/env node
/**
 * macOS Release：用 create-dmg 重建安装包，附带「解除隔离」.command 与自定义引导背景。
 * 在 tauri build（app bundle）完成后调用。
 */
import { spawnSync } from "node:child_process";
import {
  access,
  chmod,
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCT = "DocPilot";
const DMG_DIR = path.join(ROOT, "src-tauri/dmg");
const COMMAND_SRC = path.join(DMG_DIR, "remove-quarantine.command");
const COMMAND_NAME = "解除隔离.command";
const BACKGROUND = path.join(DMG_DIR, "background.png");
const ICON = path.join(ROOT, "src-tauri/icons/icon.icns");
const BUNDLE_ROOT = path.join(ROOT, "src-tauri/target/release/bundle");
const APP_DIR = path.join(BUNDLE_ROOT, "macos");
const DMG_OUT_DIR = path.join(BUNDLE_ROOT, "dmg");

const ICON_SIZE = 80;
const WINDOW = { width: 660, height: 440 };
const POSITIONS = {
  app: { x: 130, y: 230 },
  applications: { x: 330, y: 230 },
  command: { x: 530, y: 230 },
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    encoding: "utf8",
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`命令失败 (${r.status}): ${cmd} ${args.join(" ")}`);
  }
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function ensureCreateDmg() {
  const r = spawnSync("which", ["create-dmg"], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error("未找到 create-dmg。请安装：brew install create-dmg");
    process.exit(1);
  }
}

async function findBuiltDmg() {
  if (!(await pathExists(DMG_OUT_DIR))) return null;
  const files = await readdir(DMG_OUT_DIR);
  const dmg = files.find((f) => f.endsWith(".dmg"));
  return dmg ? path.join(DMG_OUT_DIR, dmg) : null;
}

async function main() {
  if (process.platform !== "darwin") {
    console.log("postprocess-dmg：非 macOS，跳过。");
    return;
  }

  ensureCreateDmg();

  const appPath = path.join(APP_DIR, `${PRODUCT}.app`);
  if (!(await pathExists(appPath))) {
    console.error(`未找到应用包：${appPath}`);
    console.error("请先运行 tauri build 生成 .app。");
    process.exit(1);
  }

  // 确保背景图存在
  run("node", ["scripts/generate-dmg-background.mjs"]);

  const staging = path.join(ROOT, "src-tauri/target/dmg-staging");
  const commandDest = path.join(staging, COMMAND_NAME);
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  await cp(appPath, path.join(staging, `${PRODUCT}.app`), { recursive: true });
  await copyFile(COMMAND_SRC, commandDest);
  await chmod(commandDest, 0o755);

  await mkdir(DMG_OUT_DIR, { recursive: true });
  const existingDmg = await findBuiltDmg();
  const conf = JSON.parse(
    await readFile(path.join(ROOT, "src-tauri/tauri.conf.json"), "utf8"),
  );
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  const dmgName = `${PRODUCT}_${conf.version}_${arch}.dmg`;
  const outDmg = path.join(DMG_OUT_DIR, dmgName);
  const tmpDmg = path.join(ROOT, "src-tauri/target/dmg-build-temp.dmg");

  await rm(tmpDmg, { force: true });
  if (existingDmg && existingDmg !== outDmg) {
    await rm(existingDmg, { force: true });
  }

  const args = [
    "--volname",
    PRODUCT,
    "--background",
    BACKGROUND,
    "--window-size",
    String(WINDOW.width),
    String(WINDOW.height),
    "--icon-size",
    String(ICON_SIZE),
    "--icon",
    `${PRODUCT}.app`,
    String(POSITIONS.app.x),
    String(POSITIONS.app.y),
    "--hide-extension",
    `${PRODUCT}.app`,
    "--app-drop-link",
    String(POSITIONS.applications.x),
    String(POSITIONS.applications.y),
    "--icon",
    COMMAND_NAME,
    String(POSITIONS.command.x),
    String(POSITIONS.command.y),
    "--hide-extension",
    COMMAND_NAME,
  ];

  if (await pathExists(ICON)) {
    args.unshift("--volicon", ICON);
  }

  args.push(tmpDmg, staging);

  console.log("正在用 create-dmg 生成安装包…");
  run("create-dmg", args);

  await rm(outDmg, { force: true });
  await copyFile(tmpDmg, outDmg);
  await rm(tmpDmg, { force: true });
  await rm(staging, { recursive: true, force: true });

  const info = await stat(outDmg);
  console.log(`DMG 已生成：${outDmg} (${(info.size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
