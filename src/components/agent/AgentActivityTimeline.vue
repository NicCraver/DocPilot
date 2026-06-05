<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { AgentActivity } from "../../agent/activities";
import AgentActivityItem from "./AgentActivityItem.vue";

const props = defineProps<{
  activities: AgentActivity[];
  loading?: boolean;
}>();

const userExpanded = ref<boolean | null>(null);

const hasRunning = computed(() => props.activities.some((a) => a.status === "running"));

const panelOpen = computed({
  get() {
    if (userExpanded.value !== null) return userExpanded.value;
    return props.loading || hasRunning.value;
  },
  set(v: boolean) {
    userExpanded.value = v;
  },
});

watch(
  () => props.loading,
  (now, prev) => {
    if (prev && !now) userExpanded.value = false;
  },
);

const summaryText = computed(() => {
  const n = props.activities.length;
  if (hasRunning.value) return `执行中 · ${n} 步`;
  const failed = props.activities.some((a) => a.status === "error");
  if (failed) return `执行过程 · ${n} 步（含失败）`;
  return `执行过程 · ${n} 步（已完成）`;
});
</script>

<template>
  <div
    v-if="activities.length"
    class="rounded-xl border border-[var(--dp-border)] bg-[var(--dp-surface-muted)]/50 overflow-hidden"
  >
    <button
      type="button"
      class="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/50 transition-colors cursor-pointer"
      :aria-expanded="panelOpen"
      @click="panelOpen = !panelOpen"
    >
      <span class="text-xs font-semibold text-[var(--dp-text-secondary)]">
        {{ summaryText }}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-4 h-4 text-[var(--dp-text-muted)] shrink-0 transition-transform duration-200"
        :class="panelOpen ? 'rotate-180' : ''"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div v-show="panelOpen" class="px-3 pb-3 space-y-2 border-t border-[var(--dp-border)]">
      <AgentActivityItem v-for="a in activities" :key="a.id" :activity="a" />
    </div>
  </div>
</template>
