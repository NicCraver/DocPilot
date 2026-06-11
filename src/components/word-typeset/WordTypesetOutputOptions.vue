<script setup lang="ts">
import { TYPESET_OUTPUT_MODE_OPTIONS, type TypesetOutputMode } from "../../lib/wordTypesetConfig";
import AppButton from "../ui/AppButton.vue";

defineProps<{
  outputDir: string | null;
}>();

const outputMode = defineModel<TypesetOutputMode>("outputMode", { required: true });
const outputSuffix = defineModel<string>("outputSuffix", { required: true });
const continueOnError = defineModel<boolean>("continueOnError", { required: true });

const emit = defineEmits<{
  pickOutputDir: [];
}>();
</script>

<template>
  <div class="output-options space-y-2">
    <p class="text-xs font-semibold text-[var(--dp-text-secondary)]">输出方式</p>
    <div class="output-mode-grid">
      <label
        v-for="opt in TYPESET_OUTPUT_MODE_OPTIONS"
        :key="opt.value"
        class="output-mode-card"
        :class="outputMode === opt.value ? 'output-mode-card--active' : ''"
      >
        <input v-model="outputMode" type="radio" class="sr-only" :value="opt.value" />
        <span class="text-xs font-semibold">{{ opt.label }}</span>
      </label>
    </div>

    <div v-if="outputMode === 'in_place'" class="output-hint">
      覆盖前会自动在同目录生成 <code class="hint-code">.docx.bak</code> 备份。
    </div>

    <div v-else-if="outputMode === 'output_dir'" class="flex gap-2 items-stretch">
      <div
        class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--dp-border)] bg-[var(--dp-surface-muted)] text-xs text-[var(--dp-text-secondary)] truncate"
        :title="outputDir ?? ''"
      >
        {{ outputDir || "未选择输出文件夹" }}
      </div>
      <button type="button" class="output-pick-btn" @click="emit('pickOutputDir')">选择</button>
    </div>

    <label v-else-if="outputMode === 'suffix'" class="field-label">
      <span>文件名后缀</span>
      <input v-model="outputSuffix" type="text" class="field-input" placeholder="_排版" />
    </label>

    <label class="check-cell">
      <input v-model="continueOnError" type="checkbox" class="check-input" />
      单文件失败时继续处理其余文件
    </label>
  </div>
</template>

<style scoped>
.output-mode-grid {
  display: grid;
  gap: 0.375rem;
}

.output-mode-card {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  background: var(--dp-surface-muted);
  cursor: pointer;
  color: var(--dp-text-secondary);
  transition:
    border-color var(--dp-dur-fast) ease,
    background-color var(--dp-dur-fast) ease;
}

.output-mode-card--active {
  border-color: var(--dp-primary);
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
}

.output-hint {
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--dp-text-muted);
  padding: 0.5rem 0.625rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
}

.hint-code {
  font-family: ui-monospace, monospace;
  font-size: 0.625rem;
}

.output-pick-btn {
  flex-shrink: 0;
  min-height: 2.5rem;
  padding: 0 0.75rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  background: var(--dp-surface);
  cursor: pointer;
}

.output-pick-btn:hover {
  border-color: var(--dp-primary);
  color: var(--dp-primary);
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--dp-text-muted);
}

.field-input {
  min-height: 2.5rem;
  padding: 0 0.625rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  background: var(--dp-surface);
}

.check-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--dp-text-secondary);
  cursor: pointer;
}

.check-input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--dp-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
