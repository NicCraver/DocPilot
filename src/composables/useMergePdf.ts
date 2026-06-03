import { ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { runTool } from "../lib/tools";

export function useMergePdf() {
  const inputPaths = ref<string[]>([]);
  const result = ref<{ output: string; pageCount: number } | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function pickFiles() {
    const selected = await open({
      multiple: true,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (Array.isArray(selected)) {
      inputPaths.value = selected;
      result.value = null;
      error.value = null;
    }
  }

  async function merge() {
    if (inputPaths.value.length < 2) {
      error.value = "请至少选择 2 个 PDF 文件";
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const first = inputPaths.value[0];
      const base = first.replace(/\.pdf$/i, "");
      const outputPath = `${base}-merged.pdf`;
      const out = await runTool("merge_pdf", {
        input_paths: inputPaths.value,
        output_path: outputPath,
      });
      result.value = {
        output: out.data.output_path as string,
        pageCount: out.data.page_count as number,
      };
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  return { inputPaths, result, error, loading, pickFiles, merge };
}
