/**
 * 生成 macOS / Tauri 应用图标
 *
 * - 源图来自无透明通道的图片时，先从四角清除外侧白/黑底
 * - 输出保留透明留白，避免 Dock 把整张 1024 方形画布当成可见内容
 */
import sharp from 'sharp'
import { copyFile, access, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 1024
const MAC_SAFE = 824
const SOURCE = path.join(ROOT, 'src-tauri/app-icon-source.png')
const OUTPUT = path.join(ROOT, 'src-tauri/app-icon.png')
const ICONSET_DIR = path.join(ROOT, 'src-tauri/icons/AppIcon.iconset')
const ICNS_OUTPUT = path.join(ROOT, 'src-tauri/icons/icon.icns')
const FALLBACK_ASSET = path.join(
  ROOT,
  '.cursor/projects/Users-nic-NicProjects-DocPilot/assets/DocPilot-68451d97-eb56-4e87-bc80-66b86edff5b0.png',
)
const MARGIN_BG = '#ecf4ff'
const BG_THRESHOLD = 248
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 }

const ICONSET_ENTRIES = [
  { file: 'icon_16x16.png', size: 16 },
  { file: 'icon_16x16@2x.png', size: 32 },
  { file: 'icon_32x32.png', size: 32 },
  { file: 'icon_32x32@2x.png', size: 64 },
  { file: 'icon_128x128.png', size: 128 },
  { file: 'icon_128x128@2x.png', size: 256 },
  { file: 'icon_256x256.png', size: 256 },
  { file: 'icon_256x256@2x.png', size: 512 },
  { file: 'icon_512x512.png', size: 512 },
  { file: 'icon_512x512@2x.png', size: 1024 },
]

async function ensureSource() {
  try {
    await access(SOURCE)
    return SOURCE
  } catch {
    try {
      await access(FALLBACK_ASSET)
      await copyFile(FALLBACK_ASSET, SOURCE)
      console.log('已从 assets 复制 app-icon-source.png')
      return SOURCE
    } catch {
      await copyFile(OUTPUT, SOURCE)
      console.log('已从现有 app-icon.png 复制 app-icon-source.png')
      return SOURCE
    }
  }
}

function isBackgroundPixel(data, channels, idx) {
  const r = data[idx]
  const g = data[idx + 1]
  const b = data[idx + 2]
  const nearWhite =
    r >= BG_THRESHOLD && g >= BG_THRESHOLD && b >= BG_THRESHOLD
  /** JPEG 导出常在圆角外铺黑底 */
  const nearBlack = r <= 12 && g <= 12 && b <= 12
  return nearWhite || nearBlack
}

function floodClearBackgroundFromCorners(data, width, height, channels) {
  const visited = new Uint8Array(width * height)
  const queue = []
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]

  for (const [x, y] of corners) {
    const idx = (y * width + x) * channels
    if (!isBackgroundPixel(data, channels, idx)) continue
    const vi = y * width + x
    if (visited[vi]) continue
    visited[vi] = 1
    queue.push(vi)
  }

  while (queue.length > 0) {
    const vi = queue.pop()
    const x = vi % width
    const y = (vi - x) / width
    const idx = vi * channels
    data[idx + 3] = 0

    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const nvi = ny * width + nx
      if (visited[nvi]) continue
      const nidx = nvi * channels
      if (!isBackgroundPixel(data, channels, nidx)) continue
      visited[nvi] = 1
      queue.push(nvi)
    }
  }
}

async function loadSourceRgba(source, inputMeta) {
  let pipeline = sharp(source)
    .trim({ threshold: 10 })
    .resize(SIZE, SIZE, {
      fit: 'inside',
      withoutEnlargement: false,
      background: TRANSPARENT_BG,
    })
    .ensureAlpha()

  if (!inputMeta.hasAlpha) {
    const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })
    floodClearBackgroundFromCorners(data, info.width, info.height, info.channels)
    pipeline = sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    })
    console.log('源图无透明通道，已从四角去除外侧白/黑底')
  }

  return pipeline.png().toBuffer()
}

async function composeMacCanvas(artworkBuffer) {
  const content = await sharp(artworkBuffer)
    .resize(MAC_SAFE, MAC_SAFE, {
      fit: 'contain',
      background: TRANSPARENT_BG,
    })
    .png()
    .toBuffer()

  const { width, height } = await sharp(content).metadata()
  const left = Math.floor((SIZE - width) / 2)
  const top = Math.floor((SIZE - height) / 2)

  const flattened = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: TRANSPARENT_BG,
    },
  })
    .composite([{ input: content, left, top }])
    .ensureAlpha()
    .png()
    .toBuffer()

  return flattened
}

async function writeIconset(masterPng) {
  await rm(ICONSET_DIR, { recursive: true, force: true })
  await mkdir(ICONSET_DIR, { recursive: true })

  for (const { file, size } of ICONSET_ENTRIES) {
    const out = path.join(ICONSET_DIR, file)
    await sharp(masterPng)
      .resize(size, size, { fit: 'fill', background: TRANSPARENT_BG })
      .ensureAlpha()
      .png()
      .toFile(out)
  }

  await execFileAsync('iconutil', ['-c', 'icns', ICONSET_DIR, '-o', ICNS_OUTPUT])
  await rm(ICONSET_DIR, { recursive: true, force: true })
  console.log(`已写入 ${path.relative(ROOT, ICNS_OUTPUT)}（iconutil）`)
}

async function main() {
  const icnsOnly = process.argv.includes('--icns-only')

  if (icnsOnly) {
    await access(OUTPUT)
    const master = await sharp(OUTPUT).ensureAlpha().png().toBuffer()
    await writeIconset(master)
    return
  }

  const source = await ensureSource()
  const inputMeta = await sharp(source).metadata()
  const artwork = await loadSourceRgba(source, inputMeta)
  const master = await composeMacCanvas(artwork)

  await sharp(master).toFile(OUTPUT)
  console.log(
    `已写入 ${path.relative(ROOT, OUTPUT)}（${SIZE}×${SIZE}，安全区 ${MAC_SAFE}px，透明留白）`,
  )

  await writeIconset(master)
}

main().catch((err) => {
  console.error('图标预处理失败:', err)
  process.exit(1)
})
