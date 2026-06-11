<script setup lang="ts">
import {
  FONT_OPTIONS,
  GOVERNMENT_REQUIRED_FONTS,
  PAGE_NUMBER_ALIGN_OPTIONS,
  SIZE_OPTIONS,
  type WordTypesetConfig,
} from "../../lib/wordTypesetConfig";
import WordTypesetJournalSection from "./WordTypesetJournalSection.vue";

defineProps<{
  showJournalSection: boolean;
  showGovernmentFontHint: boolean;
}>();

const config = defineModel<WordTypesetConfig>("config", { required: true });
</script>

<template>
  <div class="config-panel space-y-4">
    <div
      v-if="showGovernmentFontHint"
      class="font-hint p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 leading-relaxed"
    >
      机关公文方案建议安装字体：{{ GOVERNMENT_REQUIRED_FONTS.join("、") }}。未安装时 Word
      可能自动替换，导致与范文不一致。
    </div>

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
              min="0"
              max="15"
              class="field-input"
            />
            <span class="field-hint">A4 常用 2.54</span>
          </label>
          <label class="field-label">
            <span>下边距 (cm)</span>
            <input
              v-model.number="config.page.margin_bottom"
              type="number"
              step="0.01"
              min="0"
              max="15"
              class="field-input"
            />
          </label>
          <label class="field-label">
            <span>左边距 (cm)</span>
            <input
              v-model.number="config.page.margin_left"
              type="number"
              step="0.01"
              min="0"
              max="15"
              class="field-input"
            />
            <span class="field-hint">公文装订侧常略宽</span>
          </label>
          <label class="field-label">
            <span>右边距 (cm)</span>
            <input
              v-model.number="config.page.margin_right"
              type="number"
              step="0.01"
              min="0"
              max="15"
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
              min="0"
              max="10"
              class="field-input"
            />
          </label>
          <label class="field-label">
            <span>页码对齐</span>
            <select v-model="config.page.page_number_align" class="field-input">
              <option v-for="opt in PAGE_NUMBER_ALIGN_OPTIONS" :key="opt.value" :value="opt.value">
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
        <label class="switch-row">
          <span class="switch-row__label">强制设置为 A4 纸张</span>
          <input v-model="config.page.force_a4" type="checkbox" class="check-input" />
        </label>
      </div>
    </fieldset>

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
              <span>行距 (磅)</span>
              <input
                v-model.number="config.headings.title_line_spacing"
                type="number"
                step="1"
                min="0"
                max="120"
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
              <span>行距 (磅)</span>
              <input
                v-model.number="config.headings.subtitle_line_spacing"
                type="number"
                step="1"
                min="0"
                max="120"
                class="field-input"
              />
            </label>
          </div>
        </div>
      </div>
    </fieldset>

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
                <span>行距 (磅)</span>
                <input
                  v-model.number="config.headings.body_line_spacing"
                  type="number"
                  step="1"
                  min="0"
                  max="120"
                  class="field-input"
                />
                <span class="field-hint">固定值行距</span>
              </label>
            </div>
          </div>
          <label class="field-label">
            <span>首行缩进 (cm)</span>
            <input
              v-model.number="config.headings.first_line_indent"
              type="number"
              step="0.01"
              min="0"
              max="5"
              class="field-input"
            />
            <span class="field-hint">论文常用 0.74</span>
          </label>
          <label class="field-label">
            <span>整段左缩进 (cm)</span>
            <input
              v-model.number="config.headings.indent_left"
              type="number"
              step="0.01"
              min="0"
              max="10"
              class="field-input"
            />
          </label>
          <label class="field-label">
            <span>段落右缩进 (cm)</span>
            <input
              v-model.number="config.headings.indent_right"
              type="number"
              step="0.01"
              min="0"
              max="10"
              class="field-input"
            />
          </label>
        </div>
      </div>
    </fieldset>

    <WordTypesetJournalSection v-if="showJournalSection" v-model:config="config" />

    <fieldset class="config-section">
      <legend class="config-legend">
        <span class="i-lucide-table w-4 h-4 text-[var(--dp-primary)]" aria-hidden="true" />
        表格内容
        <span class="config-note">实验</span>
      </legend>
      <div class="form-stack">
        <div class="check-grid check-grid--3">
          <label class="check-cell">
            <input v-model="config.table.enabled" type="checkbox" class="check-input" />
            启用表格自动调整
          </label>
          <label class="check-cell">
            <input v-model="config.table.auto_column_width" type="checkbox" class="check-input" />
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
              min="0"
              max="5"
              class="field-input"
            />
          </label>
          <label class="field-label">
            <span>表格行距 (磅)</span>
            <input
              v-model.number="config.table.row_spacing"
              type="number"
              step="1"
              min="0"
              max="120"
              class="field-input"
            />
          </label>
          <label class="field-label">
            <span>表格行高 (cm)</span>
            <input
              v-model.number="config.table.row_height_cm"
              type="number"
              step="0.01"
              min="0"
              max="5"
              class="field-input"
            />
          </label>
          <label class="field-label">
            <span>表格宽度 (%)</span>
            <input
              v-model.number="config.table.width_percent"
              type="number"
              step="1"
              min="10"
              max="100"
              class="field-input"
            />
          </label>
        </div>
      </div>
    </fieldset>

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
        <label class="switch-row">
          <span class="switch-row__label">启用附件格式化</span>
          <input v-model="config.other.attachment_enabled" type="checkbox" class="check-input" />
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
            <input v-model="config.other.enable_symbols" type="checkbox" class="check-input" />
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
        <label class="field-label span-2-md">
          <span>数字和字母字体</span>
          <select v-model="config.other.ascii_font" class="field-input">
            <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
      </div>
    </fieldset>
  </div>
</template>

<style scoped>
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

.config-note {
  margin-left: 0.375rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--dp-radius-sm);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--dp-text-muted);
  background: var(--dp-surface-muted);
  border: 1px solid var(--dp-border);
}

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

.span-2-md {
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
}

.field-input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0 0.625rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  color: var(--dp-text);
  background: var(--dp-surface);
}

.field-input:focus {
  outline: none;
  border-color: var(--dp-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dp-primary) 20%, transparent);
}

.field-hint {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--dp-text-muted);
  line-height: 1.35;
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
}

.check-input {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  accent-color: var(--dp-primary);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  background: var(--dp-surface-muted);
  cursor: pointer;
}

.switch-row__label {
  font-size: var(--dp-text-sm);
  font-weight: 500;
  color: var(--dp-text-secondary);
}

@media (max-width: 1280px) {
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
</style>
