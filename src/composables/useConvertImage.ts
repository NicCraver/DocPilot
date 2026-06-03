import { ref } from "vue";
import { useToolRunner, pickFile, pickSave, IMAGE_FILTERS, stem } from "./useToolRunner";

export function useConvertImage() {
  const inputPath = ref<string | null>(null);
  const outputPath = ref<string | null>(null);
  const { loading, error, message, data, execute } = useToolRunner("convert_image");

  async function pick() {
    const p = await pickFile(IMAGE_FILTERS);
    if (p) {
      inputPath.value = p;
      outputPath.value = null;
    }
  }

  async function pickOutput() {
    if (!inputPath.value) return;
    const p = await pickSave(stem(inputPath.value), IMAGE_FILTERS);
    if (p) outputPath.value = p;
  }

  async function run() {
    if (!inputPath.value || !outputPath.value) return;
    await execute({ input_path: inputPath.value, output_path: outputPath.value });
  }

  return { inputPath, outputPath, loading, error, message, data, pick, pickOutput, run };
}
