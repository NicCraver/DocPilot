<script setup lang="ts">
import { computed } from "vue";
import type { ToolCallRecord } from "../../agent/runner";
import AppBadge from "../ui/AppBadge.vue";

const props = defineProps<{
  record: ToolCallRecord;
}>();

const toolFriendlyName = computed(() => {
  switch (props.record.toolName) {
    case "compress_pdf":
      return "PDF 压缩";
    case "merge_pdf":
      return "PDF 合并";
    case "split_pdf":
      return "PDF 拆分";
    default:
      return props.record.toolName;
  }
});

const isRunning = computed(() => !props.record.result && !props.record.error);
</script>

<template>
  <div
    class="border border-[var(--dp-border)] rounded-[var(--dp-radius-lg)] p-4 bg-white shadow-[var(--dp-shadow-sm)] space-y-3 max-w-xl"
  >
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          class="w-8 h-8 rounded-lg bg-[var(--dp-primary-soft)] flex items-center justify-center text-[var(--dp-primary)] shrink-0"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
            />
          </svg>
        </div>
        <span class="text-sm font-semibold text-[var(--dp-text)] truncate">
          调用工具：{{ toolFriendlyName }}
        </span>
      </div>

      <AppBadge v-if="isRunning" variant="info" pulse>执行中</AppBadge>
      <AppBadge v-else-if="record.error" variant="danger">失败</AppBadge>
      <AppBadge v-else variant="success">成功</AppBadge>
    </div>

    <div class="text-xs space-y-2 text-[var(--dp-text-secondary)]">
      <div class="space-y-1">
        <p class="font-semibold text-[var(--dp-text-muted)] uppercase tracking-wide text-[11px]">
          参数
        </p>
        <pre
          class="p-3 bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed"
          >{{ JSON.stringify(record.args, null, 2) }}</pre
        >
      </div>

      <div v-if="record.result" class="space-y-1">
        <p class="font-semibold text-[var(--dp-text-muted)] uppercase tracking-wide text-[11px]">
          结果
        </p>
        <pre
          class="p-3 bg-[var(--dp-success-soft)] border border-emerald-200 rounded-lg overflow-x-auto font-mono text-[11px] text-emerald-900"
          >{{ record.result }}</pre
        >
      </div>

      <div
        v-if="record.error"
        role="alert"
        class="p-3 bg-[var(--dp-danger-soft)] border border-red-200 rounded-lg text-red-800"
      >
        {{ record.error }}
      </div>
    </div>
  </div>
</template>
