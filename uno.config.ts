import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
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
