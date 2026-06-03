import { ref } from "vue";
import { useToolRunner, pickFile } from "./useToolRunner";

export function useComputeHash() {
  const path = ref<string | null>(null);
  const algorithm = ref<"md5" | "sha256">("md5");
  const { loading, error, message, data, execute } = useToolRunner("compute_hash");

  async function pick() {
    const p = await pickFile();
    if (p) path.value = p;
  }

  async function run() {
    if (!path.value) return;
    await execute({ path: path.value, algorithm: algorithm.value });
  }

  return { path, algorithm, loading, error, message, data, pick, run };
}
