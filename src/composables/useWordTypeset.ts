import { ref, toRaw, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  governmentWordTypesetConfig,
  mergeWordTypesetConfig,
  wordTypesetConfigForPreset,
  WORD_TYPESET_PRESETS,
  type WordTypesetConfig,
  type WordTypesetPresetId,
} from "../lib/wordTypesetConfig";
import { loadWordTypesetCache, updateWordTypesetCache } from "../lib/wordTypesetStore";

export type TypesetMode = "files" | "text";

interface TypesetFileResult {
  input: string;
  output: string;
}

interface TypesetBatchResult {
  results: TypesetFileResult[];
  logs: string[];
}

const DOCX_FILTERS = [{ name: "Word 文档", extensions: ["docx"] }];
const SAVE_DEBOUNCE_MS = 400;

function cloneConfigSnapshot(config: WordTypesetConfig): WordTypesetConfig {
  return structuredClone(toRaw(config));
}

export function useWordTypeset() {
  const mode = ref<TypesetMode>("files");
  const files = ref<string[]>([]);
  const textInput = ref("");
  const activePresetId = ref<WordTypesetPresetId>("government");
  const config = ref<WordTypesetConfig>(governmentWordTypesetConfig());
  const logs = ref<string[]>([]);
  const loading = ref(false);
  const cacheReady = ref(false);
  const error = ref<string | null>(null);
  const lastConfigPath = ref<string | null>(null);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let skipAutoSave = false;
  let initPromise: Promise<void> | null = null;

  function appendLog(line: string) {
    logs.value = [...logs.value, line];
  }

  async function persistActivePreset() {
    if (!cacheReady.value) return;
    await updateWordTypesetCache({
      activePresetId: activePresetId.value,
      presetId: activePresetId.value,
      presetConfig: cloneConfigSnapshot(config.value),
    });
  }

  function schedulePersist() {
    if (!cacheReady.value || skipAutoSave) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void persistActivePreset();
    }, SAVE_DEBOUNCE_MS);
  }

  async function ensureCacheReady() {
    if (cacheReady.value) return;
    await initFromCache();
  }

  async function switchPreset(id: WordTypesetPresetId) {
    if (id === activePresetId.value) return;

    const prevId = activePresetId.value;
    const prevConfig = cloneConfigSnapshot(config.value);
    const label = WORD_TYPESET_PRESETS.find((p) => p.id === id)?.label ?? id;

    // 先更新界面，避免缓存读写失败时切换无反馈
    skipAutoSave = true;
    activePresetId.value = id;
    config.value = wordTypesetConfigForPreset(id);
    skipAutoSave = false;

    try {
      await ensureCacheReady();

      try {
        const cache = await loadWordTypesetCache();
        skipAutoSave = true;
        config.value = structuredClone(cache.presets[id]);
        skipAutoSave = false;
      } catch (e) {
        appendLog(`读取「${label}」缓存失败，使用内置预设: ${String(e)}`);
      }

      try {
        await updateWordTypesetCache({
          activePresetId: id,
          presetId: prevId,
          presetConfig: prevConfig,
        });
      } catch (e) {
        appendLog(`写入缓存失败（当前已切换为「${label}」）: ${String(e)}`);
      }

      appendLog(`已切换为「${label}」`);
    } catch (e) {
      error.value = String(e);
      appendLog(`切换预设失败: ${String(e)}`);
    }
  }

  async function saveAsGovernmentDefault() {
    await updateWordTypesetCache({
      presetId: "government",
      presetConfig: cloneConfigSnapshot(config.value),
    });
    if (activePresetId.value === "government") {
      appendLog("已将当前配置保存为默认政府格式");
    } else {
      appendLog("已将当前配置写入政府格式预设（切换后可使用）");
    }
  }

  async function resetActivePresetBuiltin() {
    const builtin = wordTypesetConfigForPreset(activePresetId.value);
    skipAutoSave = true;
    config.value = builtin;
    skipAutoSave = false;
    await persistActivePreset();
    const label = WORD_TYPESET_PRESETS.find((p) => p.id === activePresetId.value)?.label;
    appendLog(`已恢复「${label}」内置默认`);
  }

  async function addFiles() {
    const selected = await open({ multiple: true, filters: DOCX_FILTERS });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const merged = [...files.value];
    let added = 0;
    for (const p of paths) {
      if (!merged.includes(p)) {
        merged.push(p);
        added++;
      }
    }
    files.value = merged;
    if (added) appendLog(`已添加 ${added} 个新文件`);
  }

  async function addFolder() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir !== "string") return;
    const found = await invoke<string[]>("list_docx_in_dir", { dir, recursive: true });
    const merged = [...files.value];
    let added = 0;
    for (const p of found) {
      if (!merged.includes(p)) {
        merged.push(p);
        added++;
      }
    }
    files.value = merged;
    appendLog(`从文件夹添加 ${added} 个 docx 文件`);
  }

  function removeSelected(path: string) {
    files.value = files.value.filter((f) => f !== path);
    appendLog(`已移除: ${path}`);
  }

  function clearFiles() {
    files.value = [];
    appendLog("已清空文件列表");
  }

  async function runTypeset() {
    loading.value = true;
    error.value = null;
    try {
      if (mode.value === "files") {
        if (!files.value.length) {
          throw new Error("请先添加待排版的 Word 文件");
        }
        const result = await invoke<TypesetBatchResult>("format_docx_batch", {
          input_paths: files.value,
          config: config.value,
          in_place: true,
        });
        for (const line of result.logs) appendLog(line);
        appendLog(`批量排版完成，共 ${result.results.length} 个文件`);
      } else {
        if (!textInput.value.trim()) {
          throw new Error("请输入待排版文本");
        }
        const outputPath = await save({
          defaultPath: "排版结果.docx",
          filters: DOCX_FILTERS,
        });
        if (!outputPath) {
          appendLog("已取消保存");
          return;
        }
        const result = await invoke<TypesetBatchResult>("format_docx_text", {
          text: textInput.value,
          output_path: outputPath,
          config: config.value,
        });
        for (const line of result.logs) appendLog(line);
        appendLog(`文本排版已保存: ${result.results[0]?.output ?? outputPath}`);
      }
    } catch (e) {
      error.value = String(e);
      appendLog(`错误: ${String(e)}`);
    } finally {
      loading.value = false;
    }
  }

  async function loadConfig() {
    const path = await open({
      multiple: false,
      filters: [{ name: "JSON 配置", extensions: ["json"] }],
    });
    if (typeof path !== "string") return;
    try {
      const raw = await invoke<string>("typeset_read_text_file", { path });
      const parsed = JSON.parse(raw) as Partial<WordTypesetConfig>;
      skipAutoSave = true;
      config.value = mergeWordTypesetConfig(governmentWordTypesetConfig(), parsed);
      skipAutoSave = false;
      lastConfigPath.value = path;
      await persistActivePreset();
      appendLog(`已加载配置并写入当前预设: ${path}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`加载配置失败: ${String(e)}`);
    }
  }

  async function exportConfig() {
    const label = WORD_TYPESET_PRESETS.find((p) => p.id === activePresetId.value)?.label ?? "配置";
    const path = await save({
      defaultPath: `word-typeset-${activePresetId.value}.json`,
      filters: [{ name: "JSON 配置", extensions: ["json"] }],
    });
    if (typeof path !== "string") return;
    try {
      await invoke("typeset_write_text_file", {
        path,
        content: JSON.stringify(config.value, null, 2),
      });
      lastConfigPath.value = path;
      appendLog(`已导出「${label}」: ${path}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`导出配置失败: ${String(e)}`);
    }
  }

  async function initFromCache() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      appendLog("启动 Word 批量排版模块");
      const presetBeforeLoad = activePresetId.value;
      try {
        const cache = await loadWordTypesetCache();
        // 初始化期间用户已手动切换预设时，不覆盖当前选择
        if (presetBeforeLoad === activePresetId.value) {
          skipAutoSave = true;
          activePresetId.value = cache.activePresetId;
          config.value = structuredClone(cache.presets[cache.activePresetId]);
          skipAutoSave = false;
          const label = WORD_TYPESET_PRESETS.find((p) => p.id === cache.activePresetId)?.label;
          appendLog(`已从缓存加载「${label}」配置`);
        } else {
          const label = WORD_TYPESET_PRESETS.find((p) => p.id === activePresetId.value)?.label;
          appendLog(`初始化期间已选择「${label}」，保留当前预设`);
        }
      } catch (e) {
        appendLog(`缓存加载失败，使用内置默认: ${String(e)}`);
      } finally {
        cacheReady.value = true;
      }
    })();

    return initPromise;
  }

  watch(config, () => schedulePersist(), { deep: true });

  return {
    mode,
    files,
    textInput,
    activePresetId,
    config,
    logs,
    loading,
    cacheReady,
    error,
    presets: WORD_TYPESET_PRESETS,
    addFiles,
    addFolder,
    removeSelected,
    clearFiles,
    runTypeset,
    loadConfig,
    exportConfig,
    switchPreset,
    saveAsGovernmentDefault,
    resetActivePresetBuiltin,
    initFromCache,
  };
}
