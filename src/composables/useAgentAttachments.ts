import { ref, computed } from "vue";
import type { AgentAttachment } from "../agent/attachments";
import { attachmentChips, basename } from "../agent/attachments";
import { pickAgentFiles, pickAgentDirectory } from "../agent/filePicker";
import { listFilesInDir } from "../lib/tools";

export function useAgentAttachments() {
  const pending = ref<AgentAttachment[]>([]);

  const chips = computed(() => attachmentChips(pending.value));

  const hasPending = computed(() => pending.value.length > 0);

  function removeChip(path: string) {
    pending.value = pending.value
      .map((a) => {
        if (a.kind === "file") {
          return a.path === path ? null : a;
        }
        if (a.kind === "files") {
          const paths = a.paths.filter((p) => p !== path);
          return paths.length ? { ...a, paths } : null;
        }
        const paths = a.paths.filter((p) => p !== path);
        if (a.dir === path && !paths.length) return null;
        return paths.length || a.dir !== path ? { ...a, paths } : null;
      })
      .filter((a): a is AgentAttachment => a !== null);
  }

  async function addFile() {
    const paths = await pickAgentFiles();
    if (paths.length === 1) pending.value.push({ kind: "file", path: paths[0] });
    else if (paths.length > 1) pending.value.push({ kind: "files", paths });
  }

  async function addFolder() {
    const dir = await pickAgentDirectory();
    if (!dir) return;
    const paths = await listFilesInDir(dir);
    pending.value.push({ kind: "folder", dir, paths });
  }

  function clear() {
    pending.value = [];
  }

  function takePending(): AgentAttachment[] {
    const out = [...pending.value];
    pending.value = [];
    return out;
  }

  return {
    pending,
    chips,
    hasPending,
    addFile,
    addFolder,
    removeChip,
    clear,
    takePending,
    basename,
  };
}
