import { ref } from "vue";
import { useToolRunner, pickFile, IMAGE_FILTERS, imageOut } from "./useToolRunner";

export function useCropImage() {
  const inputPath = ref<string | null>(null);
  const x = ref(0);
  const y = ref(0);
  const width = ref(100);
  const height = ref(100);
  const { loading, error, message, data, execute } = useToolRunner("crop_image");

  async function pick() {
    const p = await pickFile(IMAGE_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({
      input_path: inputPath.value,
      output_path: imageOut(inputPath.value, "-crop"),
      x: x.value,
      y: y.value,
      width: width.value,
      height: height.value,
    });
  }

  return { inputPath, x, y, width, height, loading, error, message, data, pick, run };
}
