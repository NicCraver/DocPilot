/** OSS 消息区 UI 文案（Craft Demo / craft-agents-oss 共用） */

export const CRAFT_OSS_PROCESSING_MESSAGES = [
  "处理中…",
  "思考中…",
  "嗖嗖运转…",
  "烹饪中…",
  "慢炖中…",
  "加速中…",
  "考虑中…",
] as const;

export function formatOssElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ossProcessingLabel(seconds: number, hasActivities: boolean) {
  const idx = Math.floor(seconds / 8) % CRAFT_OSS_PROCESSING_MESSAGES.length;
  const base =
    !hasActivities && seconds < 4
      ? "处理中…"
      : !hasActivities
        ? "思考中…"
        : CRAFT_OSS_PROCESSING_MESSAGES[idx];
  return `${base} ${formatOssElapsed(seconds)}`;
}
