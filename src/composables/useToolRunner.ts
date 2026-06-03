import { ref } from "vue";
import { open, save } from "@tauri-apps/plugin-dialog";
import { runTool } from "../lib/tools";

export function useToolRunner(toolId: string) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const message = ref<string | null>(null);
  const data = ref<Record<string, unknown> | null>(null);

  async function execute(args: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    message.value = null;
    try {
      const out = await runTool(toolId, args);
      data.value = out.data;
      message.value = out.message;
    } catch (e) {
      error.value = String(e);
      data.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, message, data, execute };
}

export async function pickFile(filters?: { name: string; extensions: string[] }[]) {
  const selected = await open({ multiple: false, filters });
  return typeof selected === "string" ? selected : null;
}

export async function pickFiles(filters?: { name: string; extensions: string[] }[]) {
  const selected = await open({ multiple: true, filters });
  return Array.isArray(selected) ? selected : selected ? [selected] : [];
}

export async function pickSave(
  defaultPath: string,
  filters?: { name: string; extensions: string[] }[],
) {
  const selected = await save({ defaultPath, filters });
  return typeof selected === "string" ? selected : null;
}

export function stem(path: string) {
  const i = path.lastIndexOf(".");
  return i > 0 ? path.slice(0, i) : path;
}

export function parsePageList(text: string): number[] {
  return text
    .split(/[,，\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

export const PDF_FILTERS = [{ name: "PDF", extensions: ["pdf"] }];
export const IMAGE_FILTERS = [
  { name: "图片", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] },
];

export function pdfOut(path: string, suffix: string) {
  return `${stem(path)}${suffix}.pdf`;
}

export function imageOut(path: string, suffix: string) {
  const i = path.lastIndexOf(".");
  if (i > 0) return `${path.slice(0, i)}${suffix}${path.slice(i)}`;
  return `${path}${suffix}`;
}
