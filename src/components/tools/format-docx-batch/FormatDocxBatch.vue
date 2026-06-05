<script setup lang="ts">
import { ref } from "vue";
import { pickFiles, useToolRunner } from "../../../composables/useToolRunner";
import { defaultWordTypesetConfig } from "../../../lib/wordTypesetConfig";

const paths = ref<string[]>([]);
const { loading, error, message, execute } = useToolRunner("format_docx_batch");

async function add() {
  const picked = await pickFiles([{ name: "Word", extensions: ["docx"] }]);
  paths.value = [...new Set([...paths.value, ...picked])];
}

async function run() {
  await execute({
    input_paths: paths.value,
    config: defaultWordTypesetConfig(),
    in_place: true,
  });
}
</script>

<template>
  <div class="space-y-4 max-w-xl">
    <p class="text-sm text-[var(--dp-text-secondary)]">
      使用内置默认配置批量排版。完整配置请使用侧栏「Word 批量排版」模块。
    </p>
    <ul
      class="text-xs font-mono bg-[var(--dp-surface-muted)] rounded-lg p-3 max-h-40 overflow-y-auto"
    >
      <li v-for="p in paths" :key="p" class="truncate">{{ p }}</li>
      <li v-if="!paths.length" class="text-[var(--dp-text-muted)]">尚未选择文件</li>
    </ul>
    <div class="flex gap-2">
      <button type="button" class="action-btn" @click="add">添加 docx</button>
      <button
        type="button"
        class="action-btn primary"
        :disabled="loading || !paths.length"
        @click="run"
      >
        {{ loading ? "排版中…" : "开始排版" }}
      </button>
    </div>
    <p v-if="message" class="text-sm text-emerald-700">{{ message }}</p>
    <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.action-btn {
  height: 2.25rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--dp-border);
  font-size: 0.875rem;
  cursor: pointer;
}
.action-btn.primary {
  background: var(--dp-primary);
  color: white;
  border-color: transparent;
}
</style>
