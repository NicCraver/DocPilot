import { ref } from "vue";
import { useToolRunner, pickFile, PDF_FILTERS, pdfOut } from "./useToolRunner";

export function useAddBlankPages() {
  const inputPath = ref<string | null>(null);
  const count = ref(1);
  const afterPage = ref(0);
  const { loading, error, message, data, execute } = useToolRunner("add_blank_pages");

  async function pick() {
    const p = await pickFile(PDF_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({
      input_path: inputPath.value,
      output_path: pdfOut(inputPath.value, "-blank"),
      count: count.value,
      after_page: afterPage.value,
    });
  }

  return { inputPath, count, afterPage, loading, error, message, data, pick, run };
}
