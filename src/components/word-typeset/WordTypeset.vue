<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useWordTypeset } from "../../composables/useWordTypeset";
import { FONT_OPTIONS, PAGE_NUMBER_ALIGN_OPTIONS, SIZE_OPTIONS } from "../../lib/wordTypesetConfig";
import AppButton from "../ui/AppButton.vue";

const {
  mode,
  files,
  textInput,
  activePresetId,
  config,
  logs,
  loading,
  error,
  presets,
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
} = useWordTypeset();

const selectedFile = ref<string | null>(null);
const logsExpanded = ref(false);

const fileCount = computed(() => files.value.length);
const canRun = computed(() =>
  mode.value === "files" ? files.value.length > 0 : textInput.value.trim().length > 0,
);
const activePresetMeta = computed(
  () => presets.find((p) => p.id === activePresetId.value) ?? presets[0],
);

function fileBasename(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

function fileDirname(path: string) {
  const parts = path.split(/[/\\]/);
  parts.pop();
  return parts.join("/") || "";
}

onMounted(() => {
  initFromCache();
});
</script>

<template>
  <div class="flex flex-col gap-4 min-h-0 flex-1">
    <p class="text-sm text-[var(--dp-text-secondary)] shrink-0 max-w-3xl leading-relaxed">
      批量统一页边距、标题层级、正文与表格样式。支持文件夹递归扫描，配置自动缓存并可切换政府/论文预设。
    </p>

    <div class="flex flex-col xl:flex-row gap-5 min-h-0 flex-1">
      <!-- 左侧：文件与执行 -->
      <aside
        class="w-full xl:w-[23rem] shrink-0 flex flex-col border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] bg-[var(--dp-surface)] shadow-[var(--dp-shadow-sm)] overflow-hidden"
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

        <div class="p-4 flex-1 flex flex-col min-h-0 gap-4">
          <template v-if="mode === 'files'">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-[var(--dp-text-secondary)]">待排版文件</p>
              <span
                class="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-[var(--dp-primary-soft)] text-[var(--dp-primary)]"
              >
                {{ fileCount }} 个
              </span>
            </div>

            <div class="file-list flex-1 min-h-[10rem] max-h-[18rem] overflow-y-auto">
              <button
                v-for="path in files"
                :key="path"
                type="button"
                class="file-item"
                :class="selectedFile === path ? 'file-item--selected' : ''"
                :title="path"
                @click="selectedFile = path"
                @dblclick="removeSelected(path)"
              >
                <span
                  class="i-lucide-file-type w-4 h-4 shrink-0 text-[var(--dp-primary)]"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 text-left">
                  <span class="block text-sm font-medium text-[var(--dp-text)] truncate">
                    {{ fileBasename(path) }}
                  </span>
                  <span
                    v-if="fileDirname(path)"
                    class="block text-[11px] text-[var(--dp-text-muted)] truncate mt-0.5"
                  >
                    {{ fileDirname(path) }}
                  </span>
                </span>
              </button>

              <div v-if="!files.length" class="file-empty">
                <div
                  class="w-11 h-11 rounded-xl bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] flex items-center justify-center text-[var(--dp-text-muted)]"
                  aria-hidden="true"
                >
                  <span class="i-lucide-file-plus-2 w-5 h-5" />
                </div>
                <p class="text-sm font-medium text-[var(--dp-text-secondary)]">暂无文件</p>
                <p class="text-xs text-[var(--dp-text-muted)] text-center leading-relaxed">
                  添加 .docx 文件或整个文件夹<br />双击列表项可快速移除
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
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
            </div>
          </template>

          <template v-else>
            <label class="text-xs font-semibold text-[var(--dp-text-secondary)]" for="typeset-text">
              待排版文本
            </label>
            <textarea
              id="typeset-text"
              v-model="textInput"
              class="field-textarea flex-1 min-h-[14rem]"
              placeholder="在此输入待排版文本，每行一段…"
            />
          </template>

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

          <div
            v-if="error"
            role="alert"
            class="p-3 rounded-xl bg-[var(--dp-danger-soft)] border border-red-200 text-xs text-red-800 leading-relaxed"
          >
            {{ error }}
          </div>

          <div class="border-t border-[var(--dp-border)] pt-3">
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
              <span
                class="i-lucide-chevron-down w-4 h-4 transition-transform duration-[var(--dp-dur-fast)]"
                :class="logsExpanded ? 'rotate-180' : ''"
                aria-hidden="true"
              />
            </button>
            <div
              v-show="logsExpanded"
              class="mt-2 h-28 overflow-y-auto text-[11px] font-mono log-panel rounded-lg p-2.5"
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
        class="flex-1 min-w-0 min-h-0 flex flex-col border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] bg-[var(--dp-surface)] shadow-[var(--dp-shadow-sm)] overflow-hidden"
      >
        <div
          class="shrink-0 px-5 py-4 border-b border-[var(--dp-border)] bg-[var(--dp-surface-muted)]/60 space-y-3"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-[var(--dp-primary-soft)] text-[var(--dp-primary)] flex items-center justify-center"
              aria-hidden="true"
            >
              <span class="i-lucide-sliders-horizontal w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-[var(--dp-text)]">排版配置</h3>
              <p class="text-xs text-[var(--dp-text-muted)] mt-0.5">修改后自动写入本地缓存</p>
            </div>
          </div>

          <div class="preset-switch" role="tablist" aria-label="排版预设">
            <button
              v-for="preset in presets"
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
                :class="
                  preset.id === 'government'
                    ? 'i-lucide-landmark'
                    : preset.id === 'journal'
                      ? 'i-lucide-newspaper'
                      : 'i-lucide-graduation-cap'
                "
                aria-hidden="true"
              />
              {{ preset.label }}
            </button>
          </div>
          <p class="text-[11px] text-[var(--dp-text-muted)] leading-relaxed">
            {{ activePresetMeta.description }}
          </p>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          <!-- 页面设置 -->
          <fieldset class="config-section">
            <legend class="config-legend">
              <span
                class="i-lucide-layout-template w-4 h-4 text-[var(--dp-primary)]"
                aria-hidden="true"
              />
              页面设置
            </legend>
            <div class="form-stack">
              <div class="form-grid-4">
                <label class="field-label">
                  <span>上边距 (cm)</span>
                  <input
                    v-model.number="config.page.margin_top"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>下边距 (cm)</span>
                  <input
                    v-model.number="config.page.margin_bottom"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>左边距 (cm)</span>
                  <input
                    v-model.number="config.page.margin_left"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>右边距 (cm)</span>
                  <input
                    v-model.number="config.page.margin_right"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
              </div>
              <div class="form-grid-4">
                <label class="field-label">
                  <span>页脚距 (cm)</span>
                  <input
                    v-model.number="config.page.footer_distance"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>页码对齐</span>
                  <select v-model="config.page.page_number_align" class="field-input">
                    <option
                      v-for="opt in PAGE_NUMBER_ALIGN_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </label>
                <label class="field-label">
                  <span>页码字体</span>
                  <select v-model="config.page.page_number_font" class="field-input">
                    <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                  </select>
                </label>
                <label class="field-label">
                  <span>页码字号</span>
                  <select v-model="config.page.page_number_size" class="field-input">
                    <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                  </select>
                </label>
              </div>
              <label class="check-cell check-cell--full">
                <input v-model="config.page.force_a4" type="checkbox" class="check-input" />
                强制设置为 A4 纸张
              </label>
            </div>
          </fieldset>

          <!-- 标题样式 -->
          <fieldset class="config-section">
            <legend class="config-legend">
              <span class="i-lucide-heading w-4 h-4 text-[var(--dp-primary)]" aria-hidden="true" />
              标题样式
            </legend>
            <div class="form-grid-4">
              <div class="field-group span-2">
                <p class="field-group-title">题目</p>
                <div class="field-group-row field-group-row--3">
                  <label class="field-label">
                    <span>字体</span>
                    <select v-model="config.headings.title_font" class="field-input">
                      <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                    </select>
                  </label>
                  <label class="field-label">
                    <span>字号</span>
                    <select v-model="config.headings.title_size" class="field-input">
                      <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                    </select>
                  </label>
                  <label class="field-label">
                    <span>行距</span>
                    <input
                      v-model.number="config.headings.title_line_spacing"
                      type="number"
                      class="field-input"
                    />
                  </label>
                </div>
              </div>
              <div class="field-group span-2">
                <p class="field-group-title">副标题</p>
                <div class="field-group-row field-group-row--3">
                  <label class="field-label">
                    <span>字体</span>
                    <select v-model="config.headings.subtitle_font" class="field-input">
                      <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                    </select>
                  </label>
                  <label class="field-label">
                    <span>字号</span>
                    <select v-model="config.headings.subtitle_size" class="field-input">
                      <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                    </select>
                  </label>
                  <label class="field-label">
                    <span>行距</span>
                    <input
                      v-model.number="config.headings.subtitle_line_spacing"
                      type="number"
                      class="field-input"
                    />
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          <!-- 正文与层级 -->
          <fieldset class="config-section">
            <legend class="config-legend">
              <span class="i-lucide-text w-4 h-4 text-[var(--dp-primary)]" aria-hidden="true" />
              正文与层级
            </legend>
            <div class="form-stack">
              <div class="form-grid-4">
                <div class="field-group span-2">
                  <p class="field-group-title">一级标题</p>
                  <div class="field-group-row field-group-row--2">
                    <label class="field-label">
                      <span>字体</span>
                      <select v-model="config.headings.heading1_font" class="field-input">
                        <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                      </select>
                    </label>
                    <label class="field-label">
                      <span>字号</span>
                      <select v-model="config.headings.heading1_size" class="field-input">
                        <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div class="field-group span-2">
                  <p class="field-group-title">二级标题</p>
                  <div class="field-group-row field-group-row--2">
                    <label class="field-label">
                      <span>字体</span>
                      <select v-model="config.headings.heading2_font" class="field-input">
                        <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                      </select>
                    </label>
                    <label class="field-label">
                      <span>字号</span>
                      <select v-model="config.headings.heading2_size" class="field-input">
                        <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
              <div class="form-grid-4">
                <div class="field-group span-2">
                  <p class="field-group-title">正文 / 三四级</p>
                  <div class="field-group-row field-group-row--3">
                    <label class="field-label">
                      <span>字体</span>
                      <select v-model="config.headings.body_font" class="field-input">
                        <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                      </select>
                    </label>
                    <label class="field-label">
                      <span>字号</span>
                      <select v-model="config.headings.body_size" class="field-input">
                        <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </label>
                    <label class="field-label">
                      <span>行距</span>
                      <input
                        v-model.number="config.headings.body_line_spacing"
                        type="number"
                        class="field-input"
                      />
                    </label>
                  </div>
                </div>
                <label class="field-label">
                  <span>段落左缩进 (cm)</span>
                  <input
                    v-model.number="config.headings.indent_left"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>段落右缩进 (cm)</span>
                  <input
                    v-model.number="config.headings.indent_right"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
              </div>
            </div>
          </fieldset>

          <!-- 表格 -->
          <fieldset class="config-section">
            <legend class="config-legend">
              <span class="i-lucide-table w-4 h-4 text-[var(--dp-primary)]" aria-hidden="true" />
              表格内容
              <span class="config-legend-note">（实验功能）</span>
            </legend>
            <div class="form-stack">
              <div class="check-grid check-grid--3">
                <label class="check-cell">
                  <input v-model="config.table.enabled" type="checkbox" class="check-input" />
                  启用表格自动调整
                </label>
                <label class="check-cell">
                  <input
                    v-model="config.table.auto_column_width"
                    type="checkbox"
                    class="check-input"
                  />
                  自动调整列宽
                </label>
                <label class="check-cell">
                  <input v-model="config.table.unify_borders" type="checkbox" class="check-input" />
                  统一表格边框
                </label>
                <label class="check-cell">
                  <input v-model="config.table.bold_header" type="checkbox" class="check-input" />
                  表头行加粗
                </label>
                <label class="check-cell">
                  <input v-model="config.table.smart_align" type="checkbox" class="check-input" />
                  智能调整单元格对齐
                </label>
              </div>
              <div class="form-grid-4">
                <label class="field-label">
                  <span>表头字体</span>
                  <select v-model="config.table.header_font" class="field-input">
                    <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                  </select>
                </label>
                <label class="field-label">
                  <span>表格字体</span>
                  <select v-model="config.table.body_font" class="field-input">
                    <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                  </select>
                </label>
                <label class="field-label">
                  <span>表格字号</span>
                  <select v-model="config.table.font_size" class="field-input">
                    <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                  </select>
                </label>
                <label class="field-label">
                  <span>边框粗细 (pt)</span>
                  <input
                    v-model.number="config.table.border_pt"
                    type="number"
                    step="0.1"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>表格行距 (磅)</span>
                  <input
                    v-model.number="config.table.row_spacing"
                    type="number"
                    step="1"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>表格行高 (cm)</span>
                  <input
                    v-model.number="config.table.row_height_cm"
                    type="number"
                    step="0.01"
                    class="field-input"
                  />
                </label>
                <label class="field-label">
                  <span>表格宽度 (%)</span>
                  <input
                    v-model.number="config.table.width_percent"
                    type="number"
                    min="10"
                    max="100"
                    class="field-input"
                  />
                </label>
              </div>
            </div>
          </fieldset>

          <!-- 其他元素 -->
          <fieldset class="config-section">
            <legend class="config-legend">
              <span class="i-lucide-layers w-4 h-4 text-[var(--dp-primary)]" aria-hidden="true" />
              其他元素
            </legend>
            <div class="form-stack">
              <div class="form-grid-4">
                <div class="field-group span-2">
                  <p class="field-group-title">表格标题</p>
                  <div class="field-group-row field-group-row--2">
                    <label class="field-label">
                      <span>字体</span>
                      <select v-model="config.other.table_caption_font" class="field-input">
                        <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                      </select>
                    </label>
                    <label class="field-label">
                      <span>字号</span>
                      <select v-model="config.other.table_caption_size" class="field-input">
                        <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div class="field-group span-2">
                  <p class="field-group-title">图形标题</p>
                  <div class="field-group-row field-group-row--2">
                    <label class="field-label">
                      <span>字体</span>
                      <select v-model="config.other.figure_caption_font" class="field-input">
                        <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                      </select>
                    </label>
                    <label class="field-label">
                      <span>字号</span>
                      <select v-model="config.other.figure_caption_size" class="field-input">
                        <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
              <label class="check-cell check-cell--full">
                <input
                  v-model="config.other.attachment_enabled"
                  type="checkbox"
                  class="check-input"
                />
                启用附件格式化
              </label>
              <div v-if="config.other.attachment_enabled" class="form-grid-4">
                <label class="field-label">
                  <span>附件字体</span>
                  <select v-model="config.other.attachment_font" class="field-input">
                    <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                  </select>
                </label>
                <label class="field-label">
                  <span>附件字号</span>
                  <select v-model="config.other.attachment_size" class="field-input">
                    <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                  </select>
                </label>
              </div>
              <div class="check-grid check-grid--3">
                <label class="check-cell">
                  <input v-model="config.other.auto_outline" type="checkbox" class="check-input" />
                  自动设置大纲级别
                </label>
                <label class="check-cell">
                  <input
                    v-model="config.other.enable_symbols"
                    type="checkbox"
                    class="check-input"
                  />
                  启用符号格式化
                </label>
                <label class="check-cell">
                  <input
                    v-model="config.other.collapse_empty_lines"
                    type="checkbox"
                    class="check-input"
                  />
                  TXT/MD 合并连续空行
                </label>
              </div>
              <div class="form-grid-4">
                <label class="field-label span-2">
                  <span>数字和字母字体</span>
                  <select v-model="config.other.ascii_font" class="field-input">
                    <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
                  </select>
                </label>
              </div>
            </div>
          </fieldset>
        </div>

        <div
          class="shrink-0 px-4 py-3 border-t border-[var(--dp-border)] flex flex-wrap gap-2 bg-[var(--dp-surface-muted)]/80"
        >
          <AppButton variant="secondary" size="sm" @click="loadConfig">
            <span class="i-lucide-folder-open w-3.5 h-3.5" aria-hidden="true" />
            导入 JSON
          </AppButton>
          <AppButton variant="secondary" size="sm" @click="exportConfig">
            <span class="i-lucide-save w-3.5 h-3.5" aria-hidden="true" />
            导出 JSON
          </AppButton>
          <AppButton variant="secondary" size="sm" @click="saveAsGovernmentDefault">
            <span class="i-lucide-star w-3.5 h-3.5" aria-hidden="true" />
            存为政府默认
          </AppButton>
          <AppButton variant="ghost" size="sm" @click="resetActivePresetBuiltin">
            <span class="i-lucide-rotate-ccw w-3.5 h-3.5" aria-hidden="true" />
            恢复内置默认
          </AppButton>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.preset-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.375rem;
  padding: 0.25rem;
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
}

.preset-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.25rem;
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

.preset-tab:hover {
  color: var(--dp-text);
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
  min-height: 2.5rem;
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
  align-items: flex-start;
  gap: 0.625rem;
  width: 100%;
  padding: 0.625rem 0.5rem;
  border-radius: var(--dp-radius-md);
  cursor: pointer;
  transition: background-color var(--dp-dur-fast) ease;
}

.file-item:hover {
  background: var(--dp-surface);
}

.file-item--selected {
  background: var(--dp-primary-soft);
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

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.25rem;
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

.toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.log-panel {
  background: var(--dp-surface-muted);
  border: 1px solid var(--dp-border);
  color: var(--dp-text-secondary);
}

.log-line + .log-line {
  margin-top: 0.125rem;
}

.config-section {
  margin: 0;
  padding: 1.125rem 1.25rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface);
}

.config-legend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0 0.125rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--dp-text);
}

.config-legend-note {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--dp-text-muted);
}

/* 统一四列网格：各区块列宽对齐 */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.875rem 1rem;
  align-items: start;
}

.span-2 {
  grid-column: span 2;
}

.field-group {
  padding: 0.75rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
  border: 1px solid var(--dp-border);
}

.field-group-title {
  margin-bottom: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dp-text);
}

.field-group-row {
  display: grid;
  gap: 0.625rem 0.75rem;
}

.field-group-row--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-group-row--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.check-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.check-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
  border: 1px solid var(--dp-border);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--dp-text-secondary);
  cursor: pointer;
  transition:
    border-color var(--dp-dur-fast) ease,
    background-color var(--dp-dur-fast) ease;
}

.check-cell:hover {
  border-color: var(--dp-border-strong);
  background: var(--dp-surface);
}

.check-cell--full {
  width: 100%;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--dp-text-secondary);
}

.field-label > span:first-child {
  color: var(--dp-text-muted);
  line-height: 1.3;
}

.field-input {
  width: 100%;
  min-height: 2.375rem;
  padding: 0 0.625rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  color: var(--dp-text);
  background: var(--dp-surface);
  transition:
    border-color var(--dp-dur-fast) ease,
    box-shadow var(--dp-dur-fast) ease;
}

.field-input:hover {
  border-color: var(--dp-border-strong);
}

.field-input:focus {
  outline: none;
  border-color: var(--dp-primary);
  box-shadow: var(--dp-ring);
}

select.field-input {
  padding-right: 1.75rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  appearance: none;
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
  resize: none;
  transition:
    border-color var(--dp-dur-fast) ease,
    box-shadow var(--dp-dur-fast) ease;
}

.field-textarea:focus {
  outline: none;
  border-color: var(--dp-primary);
  box-shadow: var(--dp-ring);
}

.check-input {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  border-radius: 0.25rem;
  accent-color: var(--dp-primary);
  cursor: pointer;
}

@media (max-width: 1024px) {
  .form-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .span-2,
  .span-2-md {
    grid-column: span 2;
  }

  .check-grid--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .form-grid-4,
  .check-grid,
  .check-grid--3 {
    grid-template-columns: 1fr;
  }

  .span-2,
  .span-2-md {
    grid-column: span 1;
  }

  .field-group-row--2,
  .field-group-row--3 {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-tab,
  .file-item,
  .toolbar-btn,
  .field-input,
  .field-textarea,
  .check-cell {
    transition: none;
  }
}
</style>
