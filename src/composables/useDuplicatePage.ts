import { ref } from "vue";
import { useToolRunner, pickFile, PDF_FILTERS, pdfOut } from "./useToolRunner";

export function useDuplicatePage() {
  const inputPath = ref<string | null>(null);
  const pageNumber = ref(1);
  const times = ref(1);
  const { loading, error, message, data, execute } = useToolRunner("duplicate_page");

  async function pick() {
    const p = await pickFile(PDF_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({
      input_path: inputPath.value,
      output_path: pdfOut(inputPath.value, "-dup"),
      page_number: pageNumber.value,
      times: times.value,
    });
  }

  return { inputPath, pageNumber, times, loading, error, message, data, pick, run };
}
