import { ref } from "vue";
import { useToolRunner, pickFile, IMAGE_FILTERS, imageOut } from "./useToolRunner";

export function useResizeImage() {
  const inputPath = ref<string | null>(null);
  const width = ref(800);
  const height = ref(600);
  const keepAspect = ref(true);
  const { loading, error, message, data, execute } = useToolRunner("resize_image");

  async function pick() {
    const p = await pickFile(IMAGE_FILTERS);
    if (p) inputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({
      input_path: inputPath.value,
      output_path: imageOut(inputPath.value, "-resized"),
      width: width.value,
      height: height.value,
      keep_aspect: keepAspect.value,
    });
  }

  return { inputPath, width, height, keepAspect, loading, error, message, data, pick, run };
}
