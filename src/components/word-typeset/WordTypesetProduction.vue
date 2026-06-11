<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useWordTypeset } from "../../composables/useWordTypeset";
import {
  presetIconClass,
  presetShowsJournalSection,
  type FileQueueStatus,
} from "../../lib/wordTypesetConfig";
import AppButton from "../ui/AppButton.vue";
import WordTypesetConfigPanel from "./WordTypesetConfigPanel.vue";
import WordTypesetOnboarding from "./WordTypesetOnboarding.vue";
import WordTypesetOutputOptions from "./WordTypesetOutputOptions.vue";
import WordTypesetPresetDialog, { type PresetDialogPayload } from "./WordTypesetPresetDialog.vue";
import WordTypesetSettingsMenu from "./WordTypesetSettingsMenu.vue";

const {
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
  error,
  outputMode,
  outputDir,
  outputSuffix,
  continueOnError,
  onboardingDismissed,
  successCount,
  failedCount,
  addFiles,
  addFolder,
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
  deleteActivePreset,
  configSaveStatus,
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
} = useWordTypeset();

const selectedFile = ref<string | null>(null);
const logsExpanded = ref(false);
const presetDialog = ref<null | {
  mode: "add" | "edit";
  defaultName: string;
  defaultDescription: string;
  defaultIcon: string;
}>(null);

const fileCount = computed(() => files.value.length);
const showJournalSection = computed(() =>
  presetShowsJournalSection(activePresetId.value, config.value),
);
const showGovernmentFontHint = computed(() => activePresetId.value === "government");
const canRun = computed(() =>
  mode.value === "files" ? files.value.length > 0 : textInput.value.trim().length > 0,
);

function statusLabel(status: FileQueueStatus | undefined) {
  if (status === "success") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "处理中";
  return "";
}

function statusClass(status: FileQueueStatus | undefined) {
  if (status === "success") return "file-status--ok";
  if (status === "failed") return "file-status--err";
  if (status === "running") return "file-status--run";
  return "";
}

function onGlobalKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === "Enter" && canRun.value && !loading.value) {
    e.preventDefault();
    void runTypeset();
  }
  if (mod && e.key === "o" && mode.value === "files") {
    e.preventDefault();
    void addFiles();
  }
}

async function onOnboardingSelectPreset(id: string) {
  await switchPreset(id);
  await dismissOnboarding();
}

async function onTrySample() {
  await loadSampleDocx({ skipSaveDialog: true });
  await dismissOnboarding();
}
function fileBasename(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

function fileDirname(path: string) {
  const parts = path.split(/[/\\]/);
  parts.pop();
  return parts.join("/") || "";
}

function removeFile(path: string) {
  removeSelected(path);
  if (selectedFile.value === path) selectedFile.value = null;
}

watch(files, (list) => {
  if (selectedFile.value && !list.includes(selectedFile.value)) {
    selectedFile.value = null;
  }
});

watch(error, (message) => {
  if (message) logsExpanded.value = true;
});

watch(loading, (active, wasActive) => {
  if (wasActive && !active && logs.value.length) logsExpanded.value = true;
});

function openAddPresetDialog() {
  presetDialog.value = {
    mode: "add",
    defaultName: "我的排版方案",
    defaultDescription: "基于当前配置创建的自定义方案",
    defaultIcon: "i-lucide-bookmark",
  };
}

function openEditPresetDialog() {
  if (!activePreset.value || !isActivePresetCustom.value) return;
  presetDialog.value = {
    mode: "edit",
    defaultName: activePreset.value.label,
    defaultDescription: activePreset.value.description,
    defaultIcon: presetIconClass(activePreset.value.id, activePreset.value.icon),
  };
}

async function onPresetDialogConfirm(payload: PresetDialogPayload) {
  const mode = presetDialog.value?.mode;
  presetDialog.value = null;
  if (mode === "add") {
    await addPreset(payload.name, {
      description: payload.description,
      icon: payload.icon,
    });
  } else if (mode === "edit") {
    await editActivePreset(payload);
  }
}

onMounted(() => {
  void initFromCache();
  window.addEventListener("keydown", onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
});
</script>

<template>
  <div class="word-typeset-page flex flex-col gap-3 sm:gap-4 min-h-0 flex-1">
    <p class="text-sm text-[var(--dp-text-secondary)] shrink-0 max-w-3xl leading-relaxed px-0.5">
      批量统一页边距、标题层级、正文与表格样式。左侧管理文件与执行，右侧编辑排版方案。快捷键：⌘/Ctrl+Enter
      开始排版，⌘/Ctrl+O 添加文件。
    </p>

    <WordTypesetOnboarding
      :open="!onboardingDismissed"
      @dismiss="dismissOnboarding"
      @try-sample="onTrySample"
      @select-preset="onOnboardingSelectPreset"
    />

    <div class="word-typeset-layout flex flex-col lg:flex-row gap-4 lg:gap-5">
      <!-- 左侧：文件与执行 -->
      <aside
        class="word-typeset-panel word-typeset-panel--input w-full lg:w-[22rem] xl:w-[23rem] shrink-0 flex flex-col border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] bg-[var(--dp-surface)] shadow-[var(--dp-shadow-sm)]"
      >
        <div
          class="p-1.5 border-b border-[var(--dp-border)] bg-[var(--dp-surface-muted)]"
          role="tablist"
          aria-label="排版输入方式"
        >
          <div class="grid grid-cols-2 gap-1">
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'files'"
              class="mode-tab"
              :class="mode === 'files' ? 'mode-tab--active' : ''"
              @click="mode = 'files'"
            >
              <span class="i-lucide-files w-4 h-4 shrink-0" aria-hidden="true" />
              文件批量
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'text'"
              class="mode-tab"
              :class="mode === 'text' ? 'mode-tab--active' : ''"
              @click="mode = 'text'"
            >
              <span class="i-lucide-align-left w-4 h-4 shrink-0" aria-hidden="true" />
              输入文本
            </button>
          </div>
        </div>

        <div class="word-typeset-panel-body p-3 sm:p-4 flex flex-col gap-3 sm:gap-4">
          <template v-if="mode === 'files'">
            <div class="flex items-center justify-between gap-2 shrink-0">
              <p class="text-xs font-semibold text-[var(--dp-text-secondary)]">待排版文件</p>
              <span
                class="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-[var(--dp-primary-soft)] text-[var(--dp-primary)]"
              >
                {{ fileCount }} 个
              </span>
            </div>

            <div
              class="file-list min-h-[8rem] max-h-[min(40dvh,16rem)] overflow-y-auto overscroll-y-contain"
              role="listbox"
              aria-label="待排版文件列表"
              title="可将 .docx 文件拖入此区域"
            >
              <div
                v-for="path in files"
                :key="path"
                role="option"
                class="file-item"
                :class="selectedFile === path ? 'file-item--selected' : ''"
                :aria-selected="selectedFile === path"
                :title="path"
              >
                <button type="button" class="file-item-main" @click="selectedFile = path">
                  <span
                    class="i-lucide-file-type w-4 h-4 shrink-0 text-[var(--dp-primary)]"
                    aria-hidden="true"
                  />
                  <span class="min-w-0 flex-1 text-left">
                    <span class="flex items-center gap-1.5">
                      <span class="block text-sm font-medium text-[var(--dp-text)] truncate">
                        {{ fileBasename(path) }}
                      </span>
                      <span
                        v-if="fileStatuses[path]"
                        class="file-status"
                        :class="statusClass(fileStatuses[path])"
                        :title="fileErrors[path]"
                      >
                        {{ statusLabel(fileStatuses[path]) }}
                      </span>
                    </span>
                    <span
                      v-if="fileDirname(path)"
                      class="block text-[11px] text-[var(--dp-text-muted)] truncate mt-0.5"
                    >
                      {{ fileDirname(path) }}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  class="file-item-remove"
                  :aria-label="`移除 ${fileBasename(path)}`"
                  @click="removeFile(path)"
                >
                  <span class="i-lucide-x w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div v-if="!files.length" class="file-empty">
                <div
                  class="w-11 h-11 rounded-xl bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] flex items-center justify-center text-[var(--dp-text-muted)]"
                  aria-hidden="true"
                >
                  <span class="i-lucide-file-plus-2 w-5 h-5" />
                </div>
                <p class="text-sm font-medium text-[var(--dp-text-secondary)]">暂无文件</p>
                <p class="text-xs text-[var(--dp-text-muted)] text-center leading-relaxed">
                  添加 .docx 或拖入文件<br />支持文件夹批量添加
                </p>
              </div>
            </div>

            <div class="toolbar-grid shrink-0">
              <button type="button" class="toolbar-btn" @click="addFiles">
                <span class="i-lucide-file-plus w-3.5 h-3.5" aria-hidden="true" />
                添加文件
              </button>
              <button type="button" class="toolbar-btn" @click="addFolder">
                <span class="i-lucide-folder-plus w-3.5 h-3.5" aria-hidden="true" />
                添加文件夹
              </button>
              <button
                type="button"
                class="toolbar-btn"
                :disabled="!selectedFile"
                @click="selectedFile && removeSelected(selectedFile)"
              >
                <span class="i-lucide-trash-2 w-3.5 h-3.5" aria-hidden="true" />
                移除选中
              </button>
              <button type="button" class="toolbar-btn" @click="clearFiles">
                <span class="i-lucide-eraser w-3.5 h-3.5" aria-hidden="true" />
                清空列表
              </button>
              <button
                type="button"
                class="toolbar-btn"
                :disabled="!selectedFile"
                @click="selectedFile && moveFile(selectedFile, -1)"
              >
                <span class="i-lucide-arrow-up w-3.5 h-3.5" aria-hidden="true" />
                上移
              </button>
              <button
                type="button"
                class="toolbar-btn"
                :disabled="!selectedFile"
                @click="selectedFile && moveFile(selectedFile, 1)"
              >
                <span class="i-lucide-arrow-down w-3.5 h-3.5" aria-hidden="true" />
                下移
              </button>
              <button type="button" class="toolbar-btn toolbar-btn--wide" @click="loadSampleDocx">
                <span class="i-lucide-flask-conical w-3.5 h-3.5" aria-hidden="true" />
                样例 docx
              </button>
            </div>

            <WordTypesetOutputOptions
              v-model:output-mode="outputMode"
              v-model:output-suffix="outputSuffix"
              v-model:continue-on-error="continueOnError"
              :output-dir="outputDir"
              @pick-output-dir="pickOutputDir"
            />
          </template>

          <template v-else>
            <div class="flex items-center justify-between gap-2 shrink-0">
              <label
                class="text-xs font-semibold text-[var(--dp-text-secondary)]"
                for="typeset-text"
              >
                待排版文本
              </label>
              <div class="flex gap-1">
                <button type="button" class="text-mini-btn" @click="importTextFromFile">
                  导入文件
                </button>
                <button type="button" class="text-mini-btn" @click="loadSampleText">样例</button>
              </div>
            </div>
            <p class="text-[11px] text-[var(--dp-text-muted)] leading-relaxed shrink-0">
              支持 Markdown 标题（# / ##）、中文序号（一、 / （一））；连续空行可合并为段落分隔。
            </p>
            <div class="flex-1 min-h-[14rem]">
              <textarea
                id="typeset-text"
                v-model="textInput"
                class="field-textarea h-full min-h-[14rem]"
                placeholder="在此输入待排版文本，每行一段…"
              />
            </div>
          </template>

          <div class="word-typeset-runbar shrink-0">
            <AppButton
              class="w-full"
              variant="primary"
              size="md"
              :loading="loading"
              :disabled="!canRun"
              @click="runTypeset"
            >
              {{ loading ? "排版中…" : "开始排版" }}
            </AppButton>
          </div>

          <div
            v-if="error"
            role="alert"
            class="shrink-0 p-3 rounded-xl bg-[var(--dp-danger-soft)] border border-red-200 text-xs text-red-800 leading-relaxed"
          >
            {{ error }}
          </div>

          <div
            v-if="lastResults.length"
            class="result-summary shrink-0 flex flex-wrap items-center gap-2 text-xs"
          >
            <span class="text-emerald-700 font-semibold">成功 {{ successCount }}</span>
            <span v-if="failedCount" class="text-red-700 font-semibold"
              >失败 {{ failedCount }}</span
            >
            <button type="button" class="text-mini-btn" @click="revealLastOutput">
              打开输出位置
            </button>
            <button
              v-for="item in lastResults.filter((r) => r.ok && r.output).slice(0, 3)"
              :key="item.output"
              type="button"
              class="text-mini-btn"
              @click="openPath(item.output)"
            >
              打开 {{ fileBasename(item.output) }}
            </button>
          </div>

          <div class="border-t border-[var(--dp-border)] pt-3 shrink-0">
            <button
              type="button"
              class="w-full flex items-center justify-between gap-2 text-xs font-semibold text-[var(--dp-text-muted)] cursor-pointer py-1 rounded-lg hover:text-[var(--dp-text-secondary)] transition-colors duration-[var(--dp-dur-fast)]"
              :aria-expanded="logsExpanded"
              @click="logsExpanded = !logsExpanded"
            >
              <span class="flex items-center gap-1.5">
                <span class="i-lucide-terminal w-3.5 h-3.5" aria-hidden="true" />
                运行日志
                <span
                  v-if="logs.length"
                  class="tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--dp-surface-muted)] text-[10px]"
                >
                  {{ logs.length }}
                </span>
              </span>
              <span class="flex items-center gap-1">
                <button
                  type="button"
                  class="log-action-btn"
                  title="复制日志"
                  @click.stop="copyLogs"
                >
                  <span class="i-lucide-copy w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="log-action-btn"
                  title="清空日志"
                  @click.stop="clearLogs"
                >
                  <span class="i-lucide-eraser w-3.5 h-3.5" />
                </button>
                <span
                  class="i-lucide-chevron-down w-4 h-4 transition-transform duration-[var(--dp-dur-fast)]"
                  :class="logsExpanded ? 'rotate-180' : ''"
                  aria-hidden="true"
                />
              </span>
            </button>
            <div
              v-show="logsExpanded"
              class="mt-2 h-28 sm:h-32 overflow-y-auto overscroll-y-contain text-[11px] font-mono log-panel rounded-lg p-2.5"
            >
              <p v-if="!logs.length" class="text-[var(--dp-text-muted)] text-center py-6">
                暂无日志
              </p>
              <p v-for="(line, i) in logs" :key="i" class="leading-relaxed log-line">{{ line }}</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧：排版配置 -->
      <section
        class="word-typeset-panel word-typeset-panel--config min-w-0 flex flex-col border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] bg-[var(--dp-surface)] shadow-[var(--dp-shadow-sm)]"
      >
        <div
          class="config-header shrink-0 px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--dp-border)] bg-[var(--dp-surface-muted)]/80 backdrop-blur-sm space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-8 h-8 rounded-lg bg-[var(--dp-primary-soft)] text-[var(--dp-primary)] flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <span class="i-lucide-sliders-horizontal w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-[var(--dp-text)]">排版方案</h3>
                <p class="text-xs text-[var(--dp-text-muted)] mt-0.5 truncate">
                  {{ activePreset?.label ?? "未选择" }} ·
                  <span v-if="configSaveStatus === 'saving'" class="text-[var(--dp-primary)]">
                    保存中…
                  </span>
                  <span v-else-if="configSaveStatus === 'saved'" class="text-emerald-600">
                    已自动保存
                  </span>
                  <span v-else>修改后自动缓存</span>
                </p>
              </div>
            </div>
            <WordTypesetSettingsMenu
              :can-rename="isActivePresetCustom"
              :can-delete="isActivePresetCustom"
              @import-config="loadConfig"
              @export-current-preset="exportCurrentPreset"
              @export-all-presets="exportAllPresets"
              @duplicate-preset="duplicateActivePreset"
              @reset-default="resetActivePresetBuiltin"
              @edit-preset="openEditPresetDialog"
              @delete-preset="deleteActivePreset"
            />
          </div>

          <div class="preset-bar">
            <div class="preset-switch" role="tablist" aria-label="排版方案">
              <button
                v-for="preset in presetProfiles"
                :key="preset.id"
                type="button"
                role="tab"
                class="preset-tab"
                :class="activePresetId === preset.id ? 'preset-tab--active' : ''"
                :aria-selected="activePresetId === preset.id"
                :title="preset.description"
                @click="switchPreset(preset.id)"
              >
                <span
                  class="w-4 h-4 shrink-0"
                  :class="presetIconClass(preset.id, preset.icon)"
                  aria-hidden="true"
                />
                {{ preset.label }}
              </button>
            </div>
            <button
              type="button"
              class="preset-add-btn"
              aria-label="添加排版方案"
              title="基于当前配置添加新方案"
              @click="openAddPresetDialog"
            >
              <span class="i-lucide-plus w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p
            v-if="activePreset?.description"
            class="text-[11px] text-[var(--dp-text-muted)] leading-relaxed"
          >
            {{ activePreset.description }}
          </p>

          <div v-if="isActivePresetCustom" class="preset-inline-actions">
            <button type="button" class="preset-inline-btn" @click="openEditPresetDialog">
              <span class="i-lucide-pencil w-3.5 h-3.5" />
              编辑方案
            </button>
            <button
              type="button"
              class="preset-inline-btn preset-inline-btn--danger"
              @click="deleteActivePreset"
            >
              <span class="i-lucide-trash-2 w-3.5 h-3.5" />
              删除方案
            </button>
          </div>
          <p v-else class="text-[11px] text-[var(--dp-text-muted)] leading-relaxed">
            内置方案可修改配置并「恢复默认」，不可删除。需要独立副本请用「复制当前方案」。
          </p>
        </div>

        <WordTypesetConfigPanel
          v-model:config="config"
          class="config-body p-4 sm:p-5"
          :show-journal-section="showJournalSection"
          :show-government-font-hint="showGovernmentFontHint"
        />
      </section>
    </div>

    <WordTypesetPresetDialog
      :open="presetDialog !== null"
      :mode="presetDialog?.mode"
      :title="presetDialog?.mode === 'edit' ? '编辑排版方案' : '添加排版方案'"
      :default-name="presetDialog?.defaultName"
      :default-description="presetDialog?.defaultDescription"
      :default-icon="presetDialog?.defaultIcon"
      @confirm="onPresetDialogConfirm"
      @cancel="presetDialog = null"
    />
  </div>
</template>

<style scoped>
/* 窄屏：整页纵向滚动（子项禁止 flex-1 抢高度，否则外层滚不动） */
.word-typeset-page {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  scroll-padding-bottom: 1.5rem;
}

.word-typeset-layout,
.word-typeset-panel--config,
.config-body {
  flex: none;
  min-height: auto;
}

.word-typeset-panel--input {
  overflow: hidden;
}

.word-typeset-runbar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin-inline: -0.75rem;
  padding: 0.75rem 0.75rem 0.25rem;
  background: linear-gradient(
    to top,
    var(--dp-surface) 72%,
    color-mix(in srgb, var(--dp-surface) 88%, transparent)
  );
}

/* 宽屏：双栏各自滚动 */
@media (min-width: 1024px) {
  .word-typeset-page {
    overflow: hidden;
  }

  .word-typeset-layout {
    flex: 1 1 0%;
    min-height: 0;
    overflow: hidden;
  }

  .word-typeset-panel--input {
    min-height: 0;
    max-height: 100%;
  }

  .word-typeset-panel-body {
    flex: 1 1 0%;
    min-height: 0;
    overflow: hidden;
  }

  .file-list {
    flex: 1 1 0%;
    min-height: 0;
    max-height: none;
  }

  .word-typeset-panel--config {
    flex: 1 1 0%;
    min-height: 0;
    overflow: hidden;
  }

  .config-body {
    flex: 1 1 0%;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }

  .word-typeset-runbar {
    position: static;
    margin-inline: 0;
    padding: 0;
    background: transparent;
  }

  .config-header {
    position: sticky;
    top: 0;
    z-index: 5;
  }
}

.preset-bar {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
}

.preset-bar .preset-switch {
  flex: 1 1 0%;
  min-width: 0;
}

.preset-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  flex-shrink: 0;
  border: 1px dashed var(--dp-border-strong);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface);
  color: var(--dp-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--dp-dur-fast) ease,
    color var(--dp-dur-fast) ease,
    border-color var(--dp-dur-fast) ease;
}

.preset-add-btn:hover {
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
  border-color: var(--dp-primary);
}

.preset-add-btn:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
}

.preset-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.preset-inline-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2rem;
  padding: 0 0.625rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  background: var(--dp-surface);
  cursor: pointer;
}

.preset-inline-btn:hover {
  border-color: var(--dp-primary);
  color: var(--dp-primary);
}

.preset-inline-btn--danger {
  color: var(--dp-danger, #b91c1c);
}

.preset-inline-btn--danger:hover {
  border-color: var(--dp-danger, #b91c1c);
  background: var(--dp-danger-soft);
}

.preset-switch {
  display: flex;
  gap: 0.375rem;
  padding: 0.25rem;
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.preset-switch::-webkit-scrollbar {
  display: none;
}

@media (min-width: 640px) {
  .preset-switch {
    display: flex;
    flex-wrap: wrap;
    overflow-x: visible;
  }
}

.preset-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  min-width: max(7.5rem, 33%);
  flex: 1 0 auto;
  padding: 0 0.75rem;
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color var(--dp-dur-fast) ease,
    color var(--dp-dur-fast) ease,
    box-shadow var(--dp-dur-fast) ease;
}

@media (min-width: 640px) {
  .preset-tab {
    min-width: 0;
    flex: initial;
    white-space: normal;
  }
}

.preset-tab:hover {
  color: var(--dp-text);
}

.preset-tab:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
}

.preset-tab--active {
  color: var(--dp-primary);
  background: var(--dp-primary-soft);
  box-shadow: var(--dp-shadow-sm);
}

.mode-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--dp-dur-fast) ease,
    color var(--dp-dur-fast) ease,
    box-shadow var(--dp-dur-fast) ease;
}

.mode-tab:hover {
  color: var(--dp-text);
  background: var(--dp-surface);
}

.mode-tab:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
}

.mode-tab--active {
  color: var(--dp-primary);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-sm);
}

.file-list {
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface-muted);
  padding: 0.375rem;
}

.file-item {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
  width: 100%;
  border-radius: var(--dp-radius-md);
  transition: background-color var(--dp-dur-fast) ease;
}

.file-item:hover,
.file-item:focus-within {
  background: var(--dp-surface);
}

.file-item--selected {
  background: var(--dp-primary-soft);
}

.file-item-main {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  flex: 1;
  min-width: 0;
  padding: 0.625rem 0.375rem 0.625rem 0.5rem;
  border-radius: var(--dp-radius-md);
  text-align: left;
  cursor: pointer;
}

.file-item-main:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
}

.file-item-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  margin-right: 0.125rem;
  border-radius: var(--dp-radius-md);
  color: var(--dp-text-muted);
  cursor: pointer;
  opacity: 0.72;
  transition:
    background-color var(--dp-dur-fast) ease,
    color var(--dp-dur-fast) ease,
    opacity var(--dp-dur-fast) ease;
}

.file-item-remove:hover {
  background: var(--dp-danger-soft);
  color: var(--dp-danger, #b91c1c);
  opacity: 1;
}

.file-item-remove:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
  opacity: 1;
}

@media (hover: hover) {
  .file-item-remove {
    opacity: 0;
  }

  .file-item:hover .file-item-remove,
  .file-item--selected .file-item-remove,
  .file-item:focus-within .file-item-remove {
    opacity: 1;
  }
}

.file-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 10rem;
  padding: 1.5rem 1rem;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0 0.625rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  background: var(--dp-surface);
  cursor: pointer;
  transition:
    background-color var(--dp-dur-fast) ease,
    border-color var(--dp-dur-fast) ease,
    color var(--dp-dur-fast) ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--dp-surface-muted);
  border-color: var(--dp-border-strong);
  color: var(--dp-text);
}

.toolbar-btn:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
}

.toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toolbar-btn--wide {
  grid-column: span 2;
}

.text-mini-btn {
  min-height: 1.75rem;
  padding: 0 0.5rem;
  border-radius: var(--dp-radius-sm);
  border: 1px solid var(--dp-border);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  background: var(--dp-surface);
  cursor: pointer;
}

.text-mini-btn:hover {
  border-color: var(--dp-primary);
  color: var(--dp-primary);
}

.file-status {
  flex-shrink: 0;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 999px;
}

.file-status--ok {
  background: #dcfce7;
  color: #166534;
}

.file-status--err {
  background: #fee2e2;
  color: #991b1b;
}

.file-status--run {
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
}

.log-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--dp-radius-sm);
  color: var(--dp-text-muted);
  cursor: pointer;
}

.log-action-btn:hover {
  background: var(--dp-surface-muted);
  color: var(--dp-text-secondary);
}

.result-summary {
  padding: 0.5rem 0.625rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
  border: 1px solid var(--dp-border);
}

.log-panel {
  background: var(--dp-surface-muted);
  border: 1px solid var(--dp-border);
  color: var(--dp-text-secondary);
}

.log-line + .log-line {
  margin-top: 0.125rem;
}

.field-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--dp-text);
  background: var(--dp-surface);
  resize: vertical;
}

.field-textarea:focus {
  outline: none;
  border-color: var(--dp-primary);
  box-shadow: var(--dp-ring);
}

@media (prefers-reduced-motion: reduce) {
  .mode-tab,
  .preset-tab,
  .file-item,
  .file-item-remove,
  .toolbar-btn {
    transition: none;
  }
}
</style>
