import { ref } from "vue";
import { useToolRunner, pickFiles, IMAGE_FILTERS, stem } from "./useToolRunner";

export function useImagesToPdf() {
  const inputPaths = ref<string[]>([]);
  const { loading, error, message, data, execute } = useToolRunner("images_to_pdf");

  async function pick() {
    inputPaths.value = await pickFiles(IMAGE_FILTERS);
  }

  async function run() {
    if (!inputPaths.value.length) return;
    await execute({
      input_paths: inputPaths.value,
      output_path: `${stem(inputPaths.value[0])}.pdf`,
    });
  }

  return { inputPaths, loading, error, message, data, pick, run };
}
