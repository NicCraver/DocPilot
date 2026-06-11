import { computed, ref, toRaw, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import {
  createCustomPresetId,
  defaultConfigForPresetId,
  governmentWordTypesetConfig,
  isBuiltinPresetId,
  mergeWordTypesetConfig,
  SAMPLE_GOVERNMENT_TEXT,
  wordTypesetConfigForPreset,
  type FileQueueStatus,
  type TypesetOutputMode,
  type WordTypesetConfig,
  type WordTypesetPresetId,
  type WordTypesetPresetProfile,
} from "../lib/wordTypesetConfig";
import {
  loadWordTypesetCache,
  normalizeWordTypesetCache,
  saveWordTypesetCache,
  updateWordTypesetCache,
  type WordTypesetCache,
  type WordTypesetUiPrefs,
} from "../lib/wordTypesetStore";

export type TypesetMode = "files" | "text";

export interface TypesetFileResult {
  input: string;
  output: string;
  ok: boolean;
  error?: string;
  backup?: string;
}

interface TypesetBatchResult {
  results: TypesetFileResult[];
  logs: string[];
}

const DOCX_FILTERS = [{ name: "Word 文档", extensions: ["docx"] }];
const TEXT_FILTERS = [
  { name: "文本", extensions: ["txt", "md"] },
  { name: "所有文件", extensions: ["*"] },
];
const SAVE_DEBOUNCE_MS = 400;

function cloneConfigSnapshot(config: WordTypesetConfig): WordTypesetConfig {
  return structuredClone(toRaw(config));
}

function profileLabel(profiles: WordTypesetPresetProfile[], id: string) {
  return profiles.find((p) => p.id === id)?.label ?? id;
}

function defaultUiPrefs(): WordTypesetUiPrefs {
  return {
    outputMode: "in_place",
    outputDir: null,
    outputSuffix: "_排版",
    continueOnError: true,
    onboardingDismissed: false,
  };
}

export function useWordTypeset() {
  const mode = ref<TypesetMode>("files");
  const files = ref<string[]>([]);
  const fileStatuses = ref<Record<string, FileQueueStatus>>({});
  const fileErrors = ref<Record<string, string>>({});
  const lastResults = ref<TypesetFileResult[]>([]);
  const textInput = ref("");
  const activePresetId = ref<WordTypesetPresetId>("government");
  const presetProfiles = ref<WordTypesetPresetProfile[]>([]);
  const config = ref<WordTypesetConfig>(governmentWordTypesetConfig());
  const logs = ref<string[]>([]);
  const loading = ref(false);
  const cacheReady = ref(false);
  const error = ref<string | null>(null);
  const lastConfigPath = ref<string | null>(null);

  const outputMode = ref<TypesetOutputMode>("in_place");
  const outputDir = ref<string | null>(null);
  const outputSuffix = ref("_排版");
  const continueOnError = ref(true);
  const onboardingDismissed = ref(false);
  const configSaveStatus = ref<"idle" | "saving" | "saved">("idle");

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let savedStatusTimer: ReturnType<typeof setTimeout> | null = null;
  let skipAutoSave = false;
  let initPromise: Promise<void> | null = null;
  let dragUnlisten: (() => void) | null = null;

  const activePreset = computed(
    () => presetProfiles.value.find((p) => p.id === activePresetId.value) ?? null,
  );
  const isActivePresetCustom = computed(() => activePreset.value?.kind === "custom");

  const successCount = computed(() => lastResults.value.filter((r) => r.ok).length);
  const failedCount = computed(() => lastResults.value.filter((r) => !r.ok).length);

  function appendLog(line: string) {
    logs.value = [...logs.value, line];
  }

  function resetFileStatuses(paths: string[]) {
    const next: Record<string, FileQueueStatus> = {};
    for (const p of paths) next[p] = "pending";
    fileStatuses.value = next;
    fileErrors.value = {};
  }

  function setFileStatus(path: string, status: FileQueueStatus, err?: string) {
    fileStatuses.value = { ...fileStatuses.value, [path]: status };
    if (err) fileErrors.value = { ...fileErrors.value, [path]: err };
  }

  async function persistUiPrefs() {
    if (!cacheReady.value) return;
    const cache = await loadWordTypesetCache();
    await saveWordTypesetCache({
      ...cache,
      ui: {
        ...cache.ui,
        outputMode: outputMode.value,
        outputDir: outputDir.value,
        outputSuffix: outputSuffix.value,
        continueOnError: continueOnError.value,
        onboardingDismissed: onboardingDismissed.value,
      },
    });
  }

  async function persistActivePreset() {
    if (!cacheReady.value) return;
    await updateWordTypesetCache({
      activePresetId: activePresetId.value,
      presetId: activePresetId.value,
      presetConfig: cloneConfigSnapshot(config.value),
      profiles: presetProfiles.value,
    });
    await persistUiPrefs();
  }

  function schedulePersist() {
    if (!cacheReady.value || skipAutoSave) return;
    configSaveStatus.value = "saving";
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void persistActivePreset().then(() => {
        configSaveStatus.value = "saved";
        if (savedStatusTimer) clearTimeout(savedStatusTimer);
        savedStatusTimer = setTimeout(() => {
          configSaveStatus.value = "idle";
        }, 2000);
      });
    }, SAVE_DEBOUNCE_MS);
  }

  async function ensureCacheReady() {
    if (cacheReady.value) return;
    await initFromCache();
  }

  function applyUiPrefs(ui?: WordTypesetUiPrefs) {
    const prefs = { ...defaultUiPrefs(), ...ui };
    outputMode.value = prefs.outputMode ?? "in_place";
    outputDir.value = prefs.outputDir ?? null;
    outputSuffix.value = prefs.outputSuffix ?? "_排版";
    continueOnError.value = prefs.continueOnError ?? true;
    onboardingDismissed.value = prefs.onboardingDismissed ?? false;
  }

  async function applyCacheSnapshot(cache: Awaited<ReturnType<typeof loadWordTypesetCache>>) {
    presetProfiles.value = [...cache.profiles];
    applyUiPrefs(cache.ui);
    skipAutoSave = true;
    activePresetId.value = cache.activePresetId;
    config.value = structuredClone(
      cache.presets[cache.activePresetId] ?? defaultConfigForPresetId(cache.activePresetId),
    );
    skipAutoSave = false;
  }

  async function switchPreset(id: WordTypesetPresetId) {
    if (id === activePresetId.value) return;

    const prevId = activePresetId.value;
    const prevConfig = cloneConfigSnapshot(config.value);
    const label = profileLabel(presetProfiles.value, id);

    skipAutoSave = true;
    activePresetId.value = id;
    config.value = defaultConfigForPresetId(id);
    skipAutoSave = false;

    try {
      await ensureCacheReady();

      try {
        const cache = await loadWordTypesetCache();
        presetProfiles.value = [...cache.profiles];
        skipAutoSave = true;
        config.value = structuredClone(cache.presets[id] ?? defaultConfigForPresetId(id));
        skipAutoSave = false;
      } catch (e) {
        appendLog(`读取「${label}」缓存失败，使用默认: ${String(e)}`);
      }

      try {
        await updateWordTypesetCache({
          activePresetId: id,
          presetId: prevId,
          presetConfig: prevConfig,
          profiles: presetProfiles.value,
        });
      } catch (e) {
        appendLog(`写入缓存失败（当前已切换为「${label}」）: ${String(e)}`);
      }

      appendLog(`已切换为「${label}」`);
    } catch (e) {
      error.value = String(e);
      appendLog(`切换方案失败: ${String(e)}`);
    }
  }

  async function addPreset(name: string, options?: { description?: string; icon?: string }) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const id = createCustomPresetId();
    const profile: WordTypesetPresetProfile = {
      id,
      label: trimmed,
      description: options?.description?.trim() || "基于当前配置创建的自定义方案",
      kind: "custom",
      icon: options?.icon || "i-lucide-bookmark",
    };
    const snapshot = cloneConfigSnapshot(config.value);

    try {
      await ensureCacheReady();
      const cache = await updateWordTypesetCache({
        addProfile: profile,
        presetId: id,
        presetConfig: snapshot,
        profiles: [...presetProfiles.value, profile],
      });
      presetProfiles.value = [...cache.profiles];
      await switchPreset(id);
      appendLog(`已添加方案「${profile.label}」`);
    } catch (e) {
      error.value = String(e);
      appendLog(`添加方案失败: ${String(e)}`);
    }
  }

  async function duplicateActivePreset() {
    const current = activePreset.value;
    if (!current) return;
    await addPreset(`${current.label} 副本`, {
      description: current.description,
      icon: current.icon,
    });
  }

  async function editActivePreset(payload: { name: string; description?: string; icon?: string }) {
    if (!isActivePresetCustom.value) return;
    const current = activePreset.value;
    if (!current) return;
    const trimmed = payload.name.trim();
    if (!trimmed) return;

    const nextProfiles = presetProfiles.value.map((p) =>
      p.id === current.id
        ? {
            ...p,
            label: trimmed,
            description: payload.description?.trim() ?? p.description,
            icon: payload.icon ?? p.icon,
          }
        : p,
    );
    presetProfiles.value = nextProfiles;
    try {
      await updateWordTypesetCache({ profiles: nextProfiles });
      appendLog(`已更新方案「${trimmed}」`);
    } catch (e) {
      error.value = String(e);
      appendLog(`更新方案失败: ${String(e)}`);
    }
  }

  /** @deprecated 使用 editActivePreset */
  async function renameActivePreset(name: string) {
    await editActivePreset({ name });
  }

  async function deleteActivePreset() {
    if (!isActivePresetCustom.value) return;
    const current = activePreset.value;
    if (!current) return;
    const ok = await ask(`确定删除方案「${current.label}」？此操作不可恢复。`, {
      title: "删除排版方案",
      kind: "warning",
    });
    if (!ok) return;

    try {
      const cache = await updateWordTypesetCache({ removePresetId: current.id });
      await applyCacheSnapshot(cache);
      appendLog(`已删除方案「${current.label}」`);
    } catch (e) {
      error.value = String(e);
      appendLog(`删除方案失败: ${String(e)}`);
    }
  }

  async function resetActivePresetBuiltin() {
    const id = activePresetId.value;
    const builtin = isBuiltinPresetId(id)
      ? wordTypesetConfigForPreset(id)
      : cloneConfigSnapshot(governmentWordTypesetConfig());
    skipAutoSave = true;
    config.value = builtin;
    skipAutoSave = false;
    await persistActivePreset();
    const label = profileLabel(presetProfiles.value, id);
    appendLog(`已恢复「${label}」默认配置`);
  }

  function mergeUniqueFiles(paths: string[]) {
    const merged = [...files.value];
    let added = 0;
    for (const p of paths) {
      if (!p.toLowerCase().endsWith(".docx")) continue;
      if (p.split(/[/\\]/).pop()?.startsWith("~$")) continue;
      if (!merged.includes(p)) {
        merged.push(p);
        fileStatuses.value[p] = "pending";
        added++;
      }
    }
    files.value = merged;
    return added;
  }

  async function addFiles() {
    const selected = await open({ multiple: true, filters: DOCX_FILTERS });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const added = mergeUniqueFiles(paths);
    if (added) appendLog(`已添加 ${added} 个新文件`);
  }

  async function addFolder() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir !== "string") return;
    const found = await invoke<string[]>("list_docx_in_dir", { dir, recursive: true });
    const added = mergeUniqueFiles(found);
    appendLog(`从文件夹添加 ${added} 个 docx 文件`);
  }

  function addFilesFromPaths(paths: string[]) {
    const added = mergeUniqueFiles(paths);
    if (added) appendLog(`拖入添加 ${added} 个文件`);
  }

  function removeSelected(path: string) {
    files.value = files.value.filter((f) => f !== path);
    const { [path]: _s, ...restStatus } = fileStatuses.value;
    const { [path]: _e, ...restErr } = fileErrors.value;
    fileStatuses.value = restStatus;
    fileErrors.value = restErr;
    appendLog(`已移除: ${path}`);
  }

  function clearFiles() {
    files.value = [];
    fileStatuses.value = {};
    fileErrors.value = {};
    appendLog("已清空文件列表");
  }

  function moveFile(path: string, delta: number) {
    const idx = files.value.indexOf(path);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= files.value.length) return;
    const list = [...files.value];
    const [item] = list.splice(idx, 1);
    list.splice(next, 0, item);
    files.value = list;
  }

  async function pickOutputDir() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") {
      outputDir.value = dir;
      await persistUiPrefs();
      appendLog(`输出目录: ${dir}`);
    }
  }

  async function runTypeset() {
    loading.value = true;
    error.value = null;
    lastResults.value = [];
    try {
      if (mode.value === "files") {
        if (!files.value.length) {
          throw new Error("请先添加待排版的 Word 文件");
        }
        if (outputMode.value === "output_dir" && !outputDir.value) {
          throw new Error("请选择输出文件夹");
        }
        resetFileStatuses(files.value);
        for (const p of files.value) setFileStatus(p, "running");

        const result = await invoke<TypesetBatchResult>("format_docx_batch", {
          inputPaths: files.value,
          config: config.value,
          inPlace: outputMode.value === "in_place",
          outputMode: outputMode.value,
          outputDir: outputDir.value,
          outputSuffix: outputSuffix.value,
          continueOnError: continueOnError.value,
        });

        lastResults.value = result.results;
        for (const item of result.results) {
          setFileStatus(item.input, item.ok ? "success" : "failed", item.error);
        }
        for (const line of result.logs) appendLog(line);
        const ok = result.results.filter((r) => r.ok).length;
        appendLog(`批量排版结束：成功 ${ok} / ${result.results.length}`);
        if (ok === 0 && result.results.length > 0) {
          error.value = "所有文件排版失败，请查看运行日志";
        }
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
          outputPath,
          config: config.value,
        });
        for (const line of result.logs) appendLog(line);
        lastResults.value = result.results;
        appendLog(`文本排版已保存: ${result.results[0]?.output ?? outputPath}`);
      }
    } catch (e) {
      error.value = String(e);
      appendLog(`错误: ${String(e)}`);
      for (const p of files.value) {
        if (fileStatuses.value[p] === "running") setFileStatus(p, "failed", String(e));
      }
    } finally {
      loading.value = false;
    }
  }

  function isPresetBundle(
    parsed: unknown,
  ): parsed is Partial<WordTypesetCache> & { profiles: unknown; presets: unknown } {
    return (
      typeof parsed === "object" && parsed !== null && "profiles" in parsed && "presets" in parsed
    );
  }

  async function buildExportBundle(): Promise<WordTypesetCache> {
    await persistActivePreset();
    const cache = await loadWordTypesetCache();
    return normalizeWordTypesetCache({
      ...cache,
      presets: {
        ...cache.presets,
        [activePresetId.value]: cloneConfigSnapshot(config.value),
      },
    });
  }

  async function loadConfig() {
    const path = await open({
      multiple: false,
      filters: [{ name: "JSON 配置", extensions: ["json"] }],
    });
    if (typeof path !== "string") return;
    try {
      const raw = await invoke<string>("typeset_read_text_file", { path });
      const parsed = JSON.parse(raw) as unknown;

      if (isPresetBundle(parsed)) {
        const cache = normalizeWordTypesetCache(parsed);
        await saveWordTypesetCache(cache);
        await applyCacheSnapshot(cache);
        lastConfigPath.value = path;
        appendLog(`已导入全部方案（${cache.profiles.length} 个）: ${path}`);
        return;
      }

      const partial = parsed as Partial<WordTypesetConfig>;
      skipAutoSave = true;
      config.value = mergeWordTypesetConfig(governmentWordTypesetConfig(), partial);
      skipAutoSave = false;
      lastConfigPath.value = path;
      await persistActivePreset();
      const label = profileLabel(presetProfiles.value, activePresetId.value);
      appendLog(`已导入配置到当前方案「${label}」: ${path}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`导入配置失败: ${String(e)}`);
    }
  }

  async function exportAllPresets() {
    const path = await save({
      defaultPath: "word-typeset-schemes.json",
      filters: [{ name: "JSON 方案包", extensions: ["json"] }],
    });
    if (typeof path !== "string") return;
    try {
      const bundle = await buildExportBundle();
      const payload = {
        ...bundle,
        exportedAt: new Date().toISOString(),
      };
      await invoke("typeset_write_text_file", {
        path,
        content: JSON.stringify(payload, null, 2),
      });
      lastConfigPath.value = path;
      appendLog(`已导出全部方案（${bundle.profiles.length} 个）: ${path}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`导出方案失败: ${String(e)}`);
    }
  }

  async function exportCurrentPreset() {
    const label = activePreset.value?.label ?? "排版方案";
    const path = await save({
      defaultPath: `${label}.json`,
      filters: [{ name: "JSON 配置", extensions: ["json"] }],
    });
    if (typeof path !== "string") return;
    try {
      const payload = cloneConfigSnapshot(config.value);
      await invoke("typeset_write_text_file", {
        path,
        content: JSON.stringify(payload, null, 2),
      });
      appendLog(`已导出当前方案「${label}」: ${path}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`导出当前方案失败: ${String(e)}`);
    }
  }

  async function importTextFromFile() {
    const path = await open({ multiple: false, filters: TEXT_FILTERS });
    if (typeof path !== "string") return;
    try {
      const raw = await invoke<string>("typeset_read_text_file", { path });
      textInput.value = raw;
      appendLog(`已导入文本: ${path}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`导入文本失败: ${String(e)}`);
    }
  }

  function loadSampleText() {
    textInput.value = SAMPLE_GOVERNMENT_TEXT;
    appendLog("已加载机关公文样例文本");
  }

  async function loadSampleDocx(options?: { skipSaveDialog?: boolean }) {
    try {
      let outputPath: string | null = null;
      if (options?.skipSaveDialog) {
        try {
          const { appDataDir, join } = await import("@tauri-apps/api/path");
          const base = await join(await appDataDir(), "word-typeset-samples");
          outputPath = await join(base, `排版样例-${Date.now()}.docx`);
        } catch {
          outputPath = null;
        }
      }
      if (!outputPath) {
        outputPath = await save({
          defaultPath: "排版样例.docx",
          filters: DOCX_FILTERS,
        });
      }
      if (!outputPath) return;
      const result = await invoke<TypesetBatchResult>("format_docx_text", {
        text: SAMPLE_GOVERNMENT_TEXT,
        outputPath,
        config: config.value,
      });
      const out = result.results[0]?.output ?? outputPath;
      mergeUniqueFiles([out]);
      appendLog(`已生成样例 docx: ${out}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`生成样例失败: ${String(e)}`);
    }
  }

  async function revealPath(path: string) {
    try {
      await invoke("reveal_path_in_folder", { path });
    } catch (e) {
      appendLog(`无法打开所在文件夹: ${String(e)}`);
    }
  }

  async function openPath(path: string) {
    try {
      await invoke("open_path_with_default_app", { path });
    } catch (e) {
      appendLog(`无法打开文件: ${String(e)}`);
    }
  }

  async function revealLastOutput() {
    const last = lastResults.value.find((r) => r.ok && r.output);
    if (!last?.output) {
      appendLog("暂无可打开的输出文件");
      return;
    }
    await revealPath(last.output);
  }

  function copyLogs() {
    const text = logs.value.join("\n");
    void navigator.clipboard.writeText(text).then(
      () => appendLog("日志已复制到剪贴板"),
      () => appendLog("复制日志失败"),
    );
  }

  function clearLogs() {
    logs.value = [];
  }

  async function dismissOnboarding() {
    onboardingDismissed.value = true;
    await persistUiPrefs();
  }

  async function setupDragDrop() {
    if (dragUnlisten) return;
    try {
      const win = getCurrentWindow();
      dragUnlisten = await win.onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          addFilesFromPaths(event.payload.paths);
        }
      });
    } catch {
      // 非 Tauri 环境忽略
    }
  }

  async function initFromCache() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      appendLog("启动 Word 批量排版模块");
      const presetBeforeLoad = activePresetId.value;
      try {
        const cache = await loadWordTypesetCache();
        presetProfiles.value = [...cache.profiles];
        applyUiPrefs(cache.ui);
        if (presetBeforeLoad === activePresetId.value) {
          skipAutoSave = true;
          activePresetId.value = cache.activePresetId;
          config.value = structuredClone(
            cache.presets[cache.activePresetId] ?? defaultConfigForPresetId(cache.activePresetId),
          );
          skipAutoSave = false;
          const label = profileLabel(cache.profiles, cache.activePresetId);
          appendLog(`已从缓存加载「${label}」配置`);
        } else {
          const label = profileLabel(presetProfiles.value, activePresetId.value);
          appendLog(`初始化期间已选择「${label}」，保留当前方案`);
        }
      } catch (e) {
        appendLog(`缓存加载失败，使用内置默认: ${String(e)}`);
      } finally {
        cacheReady.value = true;
        void setupDragDrop();
      }
    })();

    return initPromise;
  }

  watch(config, () => schedulePersist(), { deep: true });
  watch([outputMode, outputDir, outputSuffix, continueOnError], () => {
    if (cacheReady.value) void persistUiPrefs();
  });

  return {
    mode,
    files,
    fileStatuses,
    fileErrors,
    lastResults,
    textInput,
    activePresetId,
    activePreset,
    presetProfiles,
    isActivePresetCustom,
    config,
    logs,
    loading,
    cacheReady,
    error,
    outputMode,
    outputDir,
    outputSuffix,
    continueOnError,
    onboardingDismissed,
    configSaveStatus,
    successCount,
    failedCount,
    addFiles,
    addFolder,
    addFilesFromPaths,
    removeSelected,
    clearFiles,
    moveFile,
    pickOutputDir,
    runTypeset,
    loadConfig,
    exportAllPresets,
    exportCurrentPreset,
    switchPreset,
    addPreset,
    duplicateActivePreset,
    editActivePreset,
    renameActivePreset,
    deleteActivePreset,
    resetActivePresetBuiltin,
    importTextFromFile,
    loadSampleText,
    loadSampleDocx,
    revealPath,
    openPath,
    revealLastOutput,
    copyLogs,
    clearLogs,
    dismissOnboarding,
    initFromCache,
  };
}
