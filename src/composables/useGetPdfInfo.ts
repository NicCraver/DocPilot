import { ref } from "vue";
import { useToolRunner, pickFile, PDF_FILTERS } from "./useToolRunner";

export function useGetPdfInfo() {
  const inputPath = ref<string | null>(null);
  const { loading, error, message, data, execute } = useToolRunner("get_pdf_info");

  async function pick() {
    const p = await pickFile(PDF_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({ input_path: inputPath.value });
  }

  return { inputPath, loading, error, message, data, pick, run };
}
