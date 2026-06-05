import { createRequire } from "node:module";
import { defineConfig, presetUno } from "unocss";
import { presetIcons } from "@unocss/preset-icons";

const require = createRequire(import.meta.url);
const lucideIcons = require("@iconify-json/lucide/icons.json");

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      collections: {
        // IconifyJSON 须以函数返回，loadIcon 才会走 searchForIcon；直接传对象会被当成 SVG 字符串表而加载失败
        lucide: () => Promise.resolve(lucideIcons),
      },
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
      scale: 1,
      warn: true,
    }),
  ],
  safelist: [
    "i-lucide-arrow-up",
    "i-lucide-book-open-text",
    "i-lucide-check",
    "i-lucide-chevron-right",
    "i-lucide-circle-alert",
    "i-lucide-circle-check",
    "i-lucide-clipboard-list",
    "i-lucide-copy",
    "i-lucide-file-text",
    "i-lucide-folder",
    "i-lucide-git-branch",
    "i-lucide-list-checks",
    "i-lucide-list-tree",
    "i-lucide-notebook-pen",
    "i-lucide-paperclip",
    "i-lucide-panel-top",
    "i-lucide-play",
    "i-lucide-route",
    "i-lucide-scan-eye",
    "i-lucide-send-horizontal",
    "i-lucide-settings",
    "i-lucide-sparkles",
    "i-lucide-square",
    "i-lucide-square-terminal",
    "i-lucide-text-search",
    "i-lucide-wand-sparkles",
    "i-lucide-wrench",
    "i-lucide-x",
  ],
  theme: {
    fontFamily: {
      sans: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    },
  },
  shortcuts: {
    "dp-surface": "bg-[var(--dp-surface)] border border-[var(--dp-border)]",
    "dp-text": "text-[var(--dp-text)]",
    "dp-muted": "text-[var(--dp-text-muted)]",
  },
});
