<script setup lang="ts">
import { computed } from "vue";
import type { AgentActivity } from "../../../agent/activities";
import type { AgentLogEntry } from "../../../agent/agentLog";
import { formatLogTime, LOG_LEVEL_LABEL } from "../../../agent/agentLog";
import AgentActivityItem from "../AgentActivityItem.vue";
import AppBadge from "../../ui/AppBadge.vue";

const props = defineProps<{
  activities: AgentActivity[];
  logs: AgentLogEntry[];
  loading?: boolean;
  title?: string;
}>();

const levelVariant = (level: AgentLogEntry["level"]) => {
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

const stepCount = computed(() => props.activities.length);
const runningCount = computed(
  () => props.activities.filter((a) => a.status === "running").length,
);
</script>

<template>
  <aside
    class="flex flex-col h-full min-h-0 w-[22rem] shrink-0 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] shadow-[var(--dp-shadow-sm)] overflow-hidden"
    aria-label="Agent 编排检视器"
  >
    <div
      class="px-4 py-3 border-b border-[var(--dp-border)] bg-[var(--dp-surface-muted)] shrink-0 space-y-1"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold text-[var(--dp-text)]">
          {{ title ?? "编排检视器" }}
        </h3>
        <AppBadge v-if="loading" variant="info" pulse>运行中</AppBadge>
      </div>
      <p class="text-[11px] text-[var(--dp-text-muted)]">
        参考 AgentGUI / CopilotKit Inspector：步骤、工具与日志同屏
      </p>
      <p v-if="stepCount" class="text-xs text-[var(--dp-text-secondary)]">
        {{ stepCount }} 步
        <span v-if="runningCount"> · {{ runningCount }} 进行中</span>
      </p>
    </div>

    <!-- 垂直管道：AG-UI / AgentGUI 步骤编排 -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <section class="p-3 border-b border-[var(--dp-border)]">
        <h4 class="text-[10px] font-semibold uppercase tracking-wide text-[var(--dp-text-muted)] mb-2">
          执行管道
        </h4>
        <div v-if="activities.length" class="relative pl-4 space-y-2">
          <div
            class="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--dp-border)]"
            aria-hidden="true"
          />
          <div v-for="(a, i) in activities" :key="a.id" class="relative">
            <span
              class="absolute -left-4 top-3 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold z-10"
              :class="{
                'bg-[var(--dp-primary)] text-white': a.status === 'running',
                'bg-[var(--dp-success)] text-white': a.status === 'success',
                'bg-[var(--dp-danger)] text-white': a.status === 'error',
              }"
              aria-hidden="true"
            >
              {{ i + 1 }}
            </span>
            <AgentActivityItem :activity="a" />
          </div>
        </div>
        <p v-else class="text-xs text-[var(--dp-text-muted)] py-4 text-center">
          发送消息后，工具调用与编排步骤将显示在此
        </p>
      </section>

      <section class="p-3">
        <h4 class="text-[10px] font-semibold uppercase tracking-wide text-[var(--dp-text-muted)] mb-2">
          事件日志
        </h4>
        <div v-if="logs.length" class="space-y-2">
          <article
            v-for="(entry, i) in logs"
            :key="i"
            class="p-2.5 rounded-lg border border-[var(--dp-border)] bg-[var(--dp-surface-muted)]/60 text-xs"
          >
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <AppBadge :variant="levelVariant(entry.level)">
                {{ LOG_LEVEL_LABEL[entry.level] }}
              </AppBadge>
              <time class="text-[var(--dp-text-muted)] font-mono text-[10px]">
                {{ formatLogTime(entry.at) }}
              </time>
            </div>
            <p class="font-semibold text-[var(--dp-text)]">{{ entry.title }}</p>
            <p
              v-if="entry.detail"
              class="mt-1 text-[var(--dp-text-secondary)] font-mono whitespace-pre-wrap break-all text-[10px] leading-relaxed"
            >
              {{ entry.detail }}
            </p>
          </article>
        </div>
        <p v-else class="text-xs text-[var(--dp-text-muted)] py-2 text-center">暂无日志</p>
      </section>
    </div>
  </aside>
</template>
