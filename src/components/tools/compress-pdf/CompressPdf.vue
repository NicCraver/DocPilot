<script setup lang="ts">
import { computed } from "vue";
import { useCompressPdf } from "../../../composables/useCompressPdf";
import ToolPanel from "../shared/ToolPanel.vue";

const { inputPath, result, error, loading, pickFile, compress } = useCompressPdf();

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const ratio = computed(() => {
  if (!result.value) return 0;
  const diff = result.value.before - result.value.after;
  return Math.round((diff / result.value.before) * 100);
});
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    title="选择 PDF 文件"
    hint="点击浏览并选择需要压缩的文件"
    action-label="开始压缩"
    action-data-test="compress"
    @pick="pickFile"
    @run="compress"
  >
    <template #result>
      <div
        v-if="result"
        class="p-5 bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] space-y-4"
      >
        <div class="flex items-center gap-3 text-[var(--dp-success)]">
          <div
            class="w-8 h-8 rounded-full bg-[var(--dp-success-soft)] flex items-center justify-center border border-emerald-200"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 class="text-base font-bold text-[var(--dp-text)]">压缩完成</h3>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between text-xs font-semibold text-[var(--dp-text-secondary)]">
            <span>文件体积对比</span>
            <span class="text-[var(--dp-primary)] tabular-nums">减少 {{ ratio }}%</span>
          </div>
          <div
            class="h-3 w-full bg-[var(--dp-border)] rounded-full overflow-hidden flex"
            role="img"
            :aria-label="`压缩后约占原文件 ${100 - ratio}%`"
          >
            <div
              class="bg-[var(--dp-primary)] h-full transition-[width] duration-300"
              :style="{ width: `${100 - ratio}%` }"
            />
            <div
              class="bg-emerald-400 h-full transition-[width] duration-300"
              :style="{ width: `${ratio}%` }"
            />
          </div>
          <div
            class="flex justify-between text-xs text-[var(--dp-text-muted)] font-medium tabular-nums"
          >
            <span>压缩后: {{ formatBytes(result.after) }}</span>
            <span>压缩前: {{ formatBytes(result.before) }}</span>
          </div>
        </div>

        <div class="pt-2 border-t border-[var(--dp-border)] space-y-1">
          <p class="text-xs font-semibold text-[var(--dp-text-muted)]">输出路径</p>
          <p
            class="text-sm font-mono text-[var(--dp-text-secondary)] bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-lg p-2.5 select-all break-all"
          >
            {{ result.output }}
          </p>
        </div>
      </div>
    </template>
  </ToolPanel>
</template>
