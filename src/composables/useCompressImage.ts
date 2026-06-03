import { ref } from "vue";
import { useToolRunner, pickFile, IMAGE_FILTERS, stem } from "./useToolRunner";

export function useCompressImage() {
  const inputPath = ref<string | null>(null);
  const quality = ref(85);
  const { loading, error, message, data, execute } = useToolRunner("compress_image");

  async function pick() {
    const p = await pickFile(IMAGE_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({
      input_path: inputPath.value,
      output_path: `${stem(inputPath.value)}.jpg`,
      quality: quality.value,
    });
  }

  return { inputPath, quality, loading, error, message, data, pick, run };
}
