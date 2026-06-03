<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { AgentLogEntry, AgentLogLevel } from "../../agent/agentLog";
import { formatLogTime, LOG_LEVEL_LABEL } from "../../agent/agentLog";
import AppBadge from "../ui/AppBadge.vue";

const props = defineProps<{
  entries: AgentLogEntry[];
  loading?: boolean;
}>();

const listRef = ref<HTMLElement | null>(null);

const levelVariant = (level: AgentLogLevel) => {
  switch (level) {
    case "success":
      return "success" as const;
    case "error":
      return "danger" as const;
    case "warn":
      return "warning" as const;
    case "step":
      return "info" as const;
    default:
      return "neutral" as const;
  }
};

watch(
  () => props.entries.length,
  () => {
    nextTick(() => {
      if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight;
      }
    });
  },
);
</script>

<template>
  <aside
    class="flex flex-col h-full min-h-0 w-[17.5rem] shrink-0 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] shadow-[var(--dp-shadow-sm)] overflow-hidden"
    aria-label="智能体操作日志"
  >
    <div
      class="px-4 py-3 border-b border-[var(--dp-border)] bg-[var(--dp-surface-muted)] shrink-0 flex items-center justify-between gap-2"
    >
      <div>
        <h3 class="text-sm font-bold text-[var(--dp-text)]">操作日志</h3>
        <p class="text-[11px] text-[var(--dp-text-muted)]">智能体每一步执行记录</p>
      </div>
      <AppBadge v-if="loading" variant="info" pulse>运行中</AppBadge>
    </div>

    <div
      ref="listRef"
      class="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div
        v-if="!entries.length"
        class="h-full flex flex-col items-center justify-center text-center px-3 py-8 text-[var(--dp-text-muted)]"
      >
        <p class="text-xs leading-relaxed">发送消息后，这里会显示模型推理、工具调用等步骤。</p>
      </div>

      <article
        v-for="entry in entries"
        :key="entry.id"
        class="rounded-lg border border-[var(--dp-border)] bg-white p-2.5 space-y-1.5"
      >
        <div class="flex items-start justify-between gap-2">
          <AppBadge :variant="levelVariant(entry.level)" class="shrink-0 text-[10px]">
            {{ LOG_LEVEL_LABEL[entry.level] }}
          </AppBadge>
          <time class="text-[10px] text-[var(--dp-text-muted)] tabular-nums shrink-0">
            {{ formatLogTime(entry.at) }}
          </time>
        </div>
        <p class="text-xs font-medium text-[var(--dp-text)] leading-snug">{{ entry.title }}</p>
        <pre
          v-if="entry.detail"
          class="text-[10px] font-mono text-[var(--dp-text-secondary)] bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] rounded-md p-2 overflow-x-auto max-h-32 whitespace-pre-wrap break-all leading-relaxed"
          >{{ entry.detail }}</pre
        >
      </article>
    </div>
  </aside>
</template>
