import { ref } from "vue";
import { useToolRunner, pickFiles, pickSave, IMAGE_FILTERS, stem } from "./useToolRunner";

export function useMergeImages() {
  const inputPaths = ref<string[]>([]);
  const outputPath = ref<string | null>(null);
  const horizontal = ref(true);
  const { loading, error, message, data, execute } = useToolRunner("merge_images");

  async function pick() {
    inputPaths.value = await pickFiles(IMAGE_FILTERS);
    outputPath.value = null;
  }

  async function pickOutput() {
    const base = inputPaths.value[0] ? stem(inputPaths.value[0]) : "merged";
    const p = await pickSave(`${base}-merged.png`, [
      { name: "PNG", extensions: ["png"] },
      { name: "JPEG", extensions: ["jpg", "jpeg"] },
    ]);
    if (p) outputPath.value = p;
  }

  async function run() {
    if (inputPaths.value.length < 2 || !outputPath.value) return;
    await execute({
      input_paths: inputPaths.value,
      output_path: outputPath.value,
      horizontal: horizontal.value,
    });
  }

  return {
    inputPaths,
    outputPath,
    horizontal,
    loading,
    error,
    message,
    data,
    pick,
    pickOutput,
    run,
  };
}
