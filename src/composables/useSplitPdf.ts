import { ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { runTool } from "../lib/tools";

export function useSplitPdf() {
  const inputPath = ref<string | null>(null);
  const startPage = ref(1);
  const endPage = ref(1);
  const result = ref<{ output: string; pageCount: number } | null>(null);
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

  async function split() {
    if (!inputPath.value) return;
    loading.value = true;
    error.value = null;
    try {
      const outputPath =
        inputPath.value.replace(/\.pdf$/i, "") + `-p${startPage.value}-${endPage.value}.pdf`;
      const out = await runTool("split_pdf", {
        input_path: inputPath.value,
        output_path: outputPath,
        start_page: startPage.value,
        end_page: endPage.value,
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

  return {
    inputPath,
    startPage,
    endPage,
    result,
    error,
    loading,
    pickFile,
    split,
  };
}
