import { ref } from "vue";
import { useToolRunner, pickFile, IMAGE_FILTERS, imageOut } from "./useToolRunner";

export function useRotateImage() {
  const inputPath = ref<string | null>(null);
  const degrees = ref(90);
  const { loading, error, message, data, execute } = useToolRunner("rotate_image");

  async function pick() {
    const p = await pickFile(IMAGE_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({
      input_path: inputPath.value,
      output_path: imageOut(inputPath.value, "-rotated"),
      degrees: degrees.value,
    });
  }

  return { inputPath, degrees, loading, error, message, data, pick, run };
}
