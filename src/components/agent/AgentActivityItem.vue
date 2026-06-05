<script setup lang="ts">
import { ref } from "vue";
import type { AgentActivity } from "../../agent/activities";
import { formatActivityArgs, formatActivityResult } from "../../agent/activities";
import AppBadge from "../ui/AppBadge.vue";

const props = defineProps<{
  activity: AgentActivity;
}>();

const expanded = ref(false);

const argsText = () => formatActivityArgs(props.activity.args);
const resultText = () => formatActivityResult(props.activity.result);
const hasDetails = () =>
  Boolean(argsText() || resultText() || props.activity.detail || props.activity.error);
</script>

<template>
  <div
    class="border border-[var(--dp-border)] rounded-lg bg-[var(--dp-surface-muted)]/80 overflow-hidden"
  >
    <button
      type="button"
      class="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/60 transition-colors cursor-pointer min-h-10"
      :aria-expanded="expanded"
      :disabled="!hasDetails()"
      @click="hasDetails() && (expanded = !expanded)"
    >
      <span
        class="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs"
        :class="{
          'bg-[var(--dp-primary-soft)] text-[var(--dp-primary)]': activity.status === 'running',
          'bg-[var(--dp-success-soft)] text-[var(--dp-success)]': activity.status === 'success',
          'bg-[var(--dp-danger-soft)] text-[var(--dp-danger)]': activity.status === 'error',
        }"
        aria-hidden="true"
      >
        <span
          v-if="activity.status === 'running'"
          class="inline-block w-2 h-2 rounded-full bg-current animate-pulse"
        />
        <span v-else-if="activity.status === 'success'">✓</span>
        <span v-else>!</span>
      </span>

      <span class="flex-1 min-w-0 text-sm text-[var(--dp-text)] truncate">
        {{ activity.title }}
      </span>

      <AppBadge v-if="activity.status === 'running'" variant="info" pulse>进行中</AppBadge>

      <svg
        v-if="hasDetails()"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-4 h-4 text-[var(--dp-text-muted)] shrink-0 transition-transform duration-200"
        :class="expanded ? 'rotate-180' : ''"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div
      v-if="expanded && hasDetails()"
      class="px-3 pb-3 pt-0 space-y-2 text-xs border-t border-[var(--dp-border)] bg-white"
    >
      <p
        v-if="activity.detail"
        class="text-[var(--dp-text-secondary)] whitespace-pre-wrap font-mono"
      >
        {{ activity.detail }}
      </p>
      <div v-if="argsText()" class="space-y-1">
        <p class="font-semibold text-[var(--dp-text-muted)] uppercase tracking-wide text-[10px]">
          参数
        </p>
        <pre
          class="p-2 bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] rounded-md overflow-x-auto font-mono text-[10px]"
          >{{ argsText() }}</pre
        >
      </div>
      <div v-if="resultText()" class="space-y-1">
        <p class="font-semibold text-[var(--dp-text-muted)] uppercase tracking-wide text-[10px]">
          结果
        </p>
        <pre
          class="p-2 bg-[var(--dp-success-soft)] border border-emerald-200 rounded-md overflow-x-auto font-mono text-[10px] text-emerald-900"
          >{{ resultText() }}</pre
        >
      </div>
      <p
        v-if="activity.error"
        role="alert"
        class="p-2 bg-[var(--dp-danger-soft)] border border-red-200 rounded-md text-red-800"
      >
        {{ activity.error }}
      </p>
    </div>
  </div>
</template>
