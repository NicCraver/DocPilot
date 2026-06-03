import { ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { runTool } from "../lib/tools";

export function useCompressPdf() {
  const inputPath = ref<string | null>(null);
  const result = ref<{ before: number; after: number; output: string } | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function pickFile() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof selected === "string") {
      inputPath.value = selected;
      result.value = null;
      error.value = null;
    }
  }

  async function compress() {
    if (!inputPath.value) return;
    loading.value = true;
    error.value = null;
    try {
      const outputPath = inputPath.value.replace(/\.pdf$/i, "") + "-compressed.pdf";
      const out = await runTool("compress_pdf", {
        input_path: inputPath.value,
        output_path: outputPath,
      });
      result.value = {
        before: out.data.before_size as number,
        after: out.data.after_size as number,
        output: out.data.output_path as string,
      };
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  return { inputPath, result, error, loading, pickFile, compress };
}
