import { ref } from "vue";
import { useToolRunner, pickFile, PDF_FILTERS, pdfOut, parsePageList } from "./useToolRunner";

export function useExtractPages() {
  const inputPath = ref<string | null>(null);
  const pageList = ref("1");
  const { loading, error, message, data, execute } = useToolRunner("extract_pages");

  async function pick() {
    const p = await pickFile(PDF_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    const pages = parsePageList(pageList.value);
    if (!pages.length) return;
    await execute({
      input_path: inputPath.value,
      output_path: pdfOut(inputPath.value, "-extracted"),
      page_numbers: pages,
    });
  }

  return { inputPath, pageList, loading, error, message, data, pick, run };
}
