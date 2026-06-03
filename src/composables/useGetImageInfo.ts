import { ref } from "vue";
import { useToolRunner, pickFile, IMAGE_FILTERS } from "./useToolRunner";

export function useGetImageInfo() {
  const inputPath = ref<string | null>(null);
  const { loading, error, message, data, execute } = useToolRunner("get_image_info");

  async function pick() {
    const p = await pickFile(IMAGE_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({ input_path: inputPath.value });
  }

  return { inputPath, loading, error, message, data, pick, run };
}
