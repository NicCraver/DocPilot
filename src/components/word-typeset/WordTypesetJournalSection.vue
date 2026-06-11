<script setup lang="ts">
import { computed } from "vue";
import {
  COLUMNS_START_OPTIONS,
  ensureJournalHeader,
  FONT_OPTIONS,
  SIZE_OPTIONS,
  type WordTypesetConfig,
} from "../../lib/wordTypesetConfig";

const config = defineModel<WordTypesetConfig>("config", { required: true });

const journalHeader = computed(() => ensureJournalHeader(config.value));

function setColumns(n: number) {
  config.value.page.columns = n;
  if (n > 1 && !config.value.page.columns_start) {
    config.value.page.columns_start = "after_front_matter";
  }
}
</script>

<template>
  <fieldset class="config-section">
    <legend class="config-legend">
      <span class="i-lucide-newspaper w-4 h-4 text-[var(--dp-primary)]" aria-hidden="true" />
      期刊 / 双栏
    </legend>
    <div class="form-stack">
      <div class="form-grid-4">
        <label class="field-label">
          <span>分栏数</span>
          <select
            class="field-input"
            :value="config.page.columns ?? 1"
            @change="setColumns(Number(($event.target as HTMLSelectElement).value))"
          >
            <option :value="1">单栏</option>
            <option :value="2">双栏</option>
          </select>
        </label>
        <label class="field-label">
          <span>栏间距 (cm)</span>
          <input
            v-model.number="config.page.column_gap_cm"
            type="number"
            step="0.01"
            class="field-input"
          />
        </label>
        <label class="field-label span-2">
          <span>双栏起始</span>
          <select v-model="config.page.columns_start" class="field-input">
            <option v-for="opt in COLUMNS_START_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>
        <label class="field-label">
          <span>页眉距 (cm)</span>
          <input
            v-model.number="config.page.header_distance"
            type="number"
            step="0.01"
            class="field-input"
          />
        </label>
      </div>

      <label class="check-cell check-cell--full">
        <input v-model="journalHeader.enabled" type="checkbox" class="check-input" />
        启用期刊页眉
      </label>

      <template v-if="journalHeader.enabled">
        <div class="form-grid-4">
          <label class="field-label">
            <span>页眉字体</span>
            <select v-model="journalHeader.font" class="field-input">
              <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
            </select>
          </label>
          <label class="field-label">
            <span>页眉字号</span>
            <select v-model="journalHeader.size" class="field-input">
              <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
            </select>
          </label>
          <label class="check-cell span-2">
            <input
              v-model="journalHeader.center_char_spacing"
              type="checkbox"
              class="check-input"
            />
            刊名居中加空格（煤 炭 工 程）
          </label>
        </div>
        <p class="field-hint">题名页页眉</p>
        <div class="form-grid-4">
          <label class="field-label">
            <span>左</span>
            <input
              v-model="journalHeader.first_left"
              class="field-input"
              placeholder="第56卷第10期"
            />
          </label>
          <label class="field-label">
            <span>中</span>
            <input
              v-model="journalHeader.first_center"
              class="field-input"
              placeholder="煤炭工程"
            />
          </label>
          <label class="field-label span-2">
            <span>右</span>
            <input
              v-model="journalHeader.first_right"
              class="field-input"
              placeholder="Vol. 56, No. 10"
            />
          </label>
        </div>
        <p class="field-hint">正文页页眉</p>
        <div class="form-grid-4">
          <label class="field-label">
            <span>左</span>
            <input
              v-model="journalHeader.running_left"
              class="field-input"
              placeholder="2024 年第10 期"
            />
          </label>
          <label class="field-label">
            <span>中</span>
            <input
              v-model="journalHeader.running_center"
              class="field-input"
              placeholder="煤炭工程"
            />
          </label>
          <label class="field-label span-2">
            <span>右</span>
            <input
              v-model="journalHeader.running_right"
              class="field-input"
              placeholder="专家论坛"
            />
          </label>
        </div>
      </template>

      <div class="form-grid-4">
        <label class="field-label">
          <span>摘要字体</span>
          <select v-model="config.other.abstract_font" class="field-input">
            <option v-for="f in FONT_OPTIONS" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
        <label class="field-label">
          <span>摘要字号</span>
          <select v-model="config.other.abstract_size" class="field-input">
            <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="field-label">
          <span>摘要悬挂缩进 (cm)</span>
          <input
            v-model.number="config.other.abstract_hang_indent_cm"
            type="number"
            step="0.01"
            class="field-input"
          />
        </label>
        <label class="field-label">
          <span>作者单位字号</span>
          <select v-model="config.other.affiliation_size" class="field-input">
            <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
      </div>

      <div class="check-grid check-grid--3">
        <label class="check-cell">
          <input v-model="config.other.three_line_table" type="checkbox" class="check-input" />
          三线表
        </label>
        <label class="check-cell">
          <input v-model="config.other.citation_superscript" type="checkbox" class="check-input" />
          引文上标 [1]
        </label>
        <label class="field-label">
          <span>英文表题字号</span>
          <select v-model="config.other.table_caption_en_size" class="field-input">
            <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
      </div>
    </div>
  </fieldset>
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

.check-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
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

.field-hint {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--dp-text-muted);
}

.check-input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--dp-primary);
}

@media (max-width: 1280px) {
  .form-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .span-2 {
    grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .form-grid-4,
  .check-grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1;
  }
}
</style>
