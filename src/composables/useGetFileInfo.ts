import { ref } from "vue";
import { useToolRunner, pickFile } from "./useToolRunner";

export function useGetFileInfo() {
  const path = ref<string | null>(null);
  const { loading, error, message, data, execute } = useToolRunner("get_file_info");

  async function pick() {
    const p = await pickFile();
    if (p) path.value = p;
  }

  async function run() {
    if (!path.value) return;
    await execute({ path: path.value });
  }

  return { path, loading, error, message, data, pick, run };
}
