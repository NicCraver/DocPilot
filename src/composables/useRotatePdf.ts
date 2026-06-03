import { ref } from "vue";
import { useToolRunner, pickFile, PDF_FILTERS, pdfOut, parsePageList } from "./useToolRunner";

export function useRotatePdf() {
  const inputPath = ref<string | null>(null);
  const degrees = ref(90);
  const pageList = ref("");
  const { loading, error, message, data, execute } = useToolRunner("rotate_pdf");

  async function pick() {
    const p = await pickFile(PDF_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    const pages = parsePageList(pageList.value);
    const args: Record<string, unknown> = {
      input_path: inputPath.value,
      output_path: pdfOut(inputPath.value, "-rotated"),
      degrees: degrees.value,
    };
    if (pages.length) args.page_numbers = pages;
    await execute(args);
  }

  return { inputPath, degrees, pageList, loading, error, message, data, pick, run };
}
