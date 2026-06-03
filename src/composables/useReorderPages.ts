import { ref } from "vue";
import { useToolRunner, pickFile, PDF_FILTERS, pdfOut, parsePageList } from "./useToolRunner";

export function useReorderPages() {
  const inputPath = ref<string | null>(null);
  const orderList = ref("1");
  const { loading, error, message, data, execute } = useToolRunner("reorder_pages");

  async function pick() {
    const p = await pickFile(PDF_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    const order = parsePageList(orderList.value);
    if (!order.length) return;
    await execute({
      input_path: inputPath.value,
      output_path: pdfOut(inputPath.value, "-reordered"),
      new_order: order,
    });
  }

  return { inputPath, orderList, loading, error, message, data, pick, run };
}
