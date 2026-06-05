<script setup lang="ts">
import type { ChatMessage } from "../../../composables/agentChatSession";
import AgentActivityTimeline from "../AgentActivityTimeline.vue";
import AgentMarkdown from "../AgentMarkdown.vue";

defineProps<{
  msg: ChatMessage;
  msgIndex: number;
  messageCount: number;
  loading: boolean;
}>();

function assistantResultText(msg: ChatMessage): string {
  return msg.content || msg.draftContent || "";
}

function isLastAssistant(index: number, count: number, msg: ChatMessage): boolean {
  return msg.role === "assistant" && index === count - 1;
}
</script>

<template>
  <AgentActivityTimeline
    v-if="msg.activities?.length"
    :activities="msg.activities"
    :loading="loading && isLastAssistant(msgIndex, messageCount, msg)"
  />

  <div
    v-if="assistantResultText(msg)"
    class="px-4 py-3 bg-white border border-[var(--dp-border)] text-[var(--dp-text)] rounded-bl-md shadow-[var(--dp-shadow-sm)]"
  >
    <p
      class="text-[10px] font-semibold uppercase tracking-wide mb-2"
      :class="
        loading && isLastAssistant(msgIndex, messageCount, msg) && !msg.content
          ? 'text-[var(--dp-primary)]'
          : 'text-[var(--dp-success)]'
      "
    >
      {{
        loading && isLastAssistant(msgIndex, messageCount, msg) && !msg.content
          ? "正在生成结果"
          : "任务结果"
      }}
    </p>
    <AgentMarkdown
      :content="assistantResultText(msg)"
      :streaming="loading && isLastAssistant(msgIndex, messageCount, msg)"
    />
  </div>

  <div
    v-else-if="loading && isLastAssistant(msgIndex, messageCount, msg)"
    class="px-4 py-3 bg-white border border-[var(--dp-border)] rounded-bl-md shadow-[var(--dp-shadow-sm)]"
  >
    <p class="text-xs text-[var(--dp-text-muted)] flex items-center gap-2">
      <span class="inline-flex gap-1" aria-hidden="true">
        <span
          class="w-1.5 h-1.5 rounded-full bg-[var(--dp-primary)]/50 animate-bounce"
          style="animation-delay: 0ms"
        />
        <span
          class="w-1.5 h-1.5 rounded-full bg-[var(--dp-primary)]/50 animate-bounce"
          style="animation-delay: 150ms"
        />
        <span
          class="w-1.5 h-1.5 rounded-full bg-[var(--dp-primary)]/50 animate-bounce"
          style="animation-delay: 300ms"
        />
      </span>
      <span aria-live="polite">正在处理，完成后将在此显示结果…</span>
    </p>
  </div>
</template>
