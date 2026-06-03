import { ref } from "vue";
import { useToolRunner, pickFile, pickSave } from "./useToolRunner";

export function useMoveFile() {
  const src = ref<string | null>(null);
  const dest = ref<string | null>(null);
  const { loading, error, message, data, execute } = useToolRunner("move_file");

  async function pickSrc() {
    const p = await pickFile();
    if (p) {
      src.value = p;
      dest.value = null;
    }
  }

  async function pickDest() {
    if (!src.value) return;
    const name = src.value.split("/").pop() || "file";
    const p = await pickSave(name);
    if (p) dest.value = p;
  }

  async function run() {
    if (!src.value || !dest.value) return;
    await execute({ src: src.value, dest: dest.value });
  }

  return { src, dest, loading, error, message, data, pickSrc, pickDest, run };
}
