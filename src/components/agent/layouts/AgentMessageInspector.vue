<script setup lang="ts">
import type { ChatMessage } from "../../../composables/agentChatSession";
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
  <!-- Inspector 模式：对话区只展示最终输出，编排细节在右侧面板 -->
  <div
    v-if="assistantResultText(msg)"
    class="px-4 py-3 bg-white border border-[var(--dp-border)] rounded-2xl rounded-bl-md shadow-[var(--dp-shadow-sm)] min-w-0"
  >
    <AgentMarkdown
      :content="assistantResultText(msg)"
      :streaming="loading && isLastAssistant(msgIndex, messageCount, msg)"
    />
  </div>

  <div
    v-else-if="loading && isLastAssistant(msgIndex, messageCount, msg)"
    class="px-4 py-3 bg-white/80 border border-dashed border-[var(--dp-border)] rounded-2xl text-xs text-[var(--dp-text-muted)]"
    aria-live="polite"
  >
    编排执行中，结果将流式出现在此…
  </div>

  <div
    v-else-if="msg.activities?.length && !msg.content"
    class="px-4 py-2 text-xs text-[var(--dp-text-muted)] italic"
  >
    本轮无文本输出，请查看右侧编排检视器。
  </div>
</template>
