<script setup lang="ts">
import { computed } from "vue";
import type { ChatMessage } from "../../../composables/agentChatSession";
import { toolFriendlyName } from "../../../agent/activities";
import AgentActivityItem from "../AgentActivityItem.vue";
import AgentMarkdown from "../AgentMarkdown.vue";
import AppBadge from "../../ui/AppBadge.vue";

const props = defineProps<{
  msg: ChatMessage;
  msgIndex: number;
  messageCount: number;
  loading: boolean;
}>();

const activities = computed(() => props.msg.activities ?? []);

const runningActivity = computed(() => activities.value.find((a) => a.status === "running"));

const statusLine = computed(() => {
  const run = runningActivity.value;
  if (!run) {
    if (props.loading && isLast.value) return "正在思考…";
    return null;
  }
  if (run.kind === "tool" && run.toolName) {
    return `正在调用 ${toolFriendlyName(run.toolName)}…`;
  }
  return run.title;
});

const isLast = computed(
  () => props.msg.role === "assistant" && props.msgIndex === props.messageCount - 1,
);

function assistantResultText(msg: ChatMessage): string {
  return msg.content || msg.draftContent || "";
}
</script>

<template>
  <div
    class="rounded-2xl border border-[var(--dp-border)] bg-white shadow-[var(--dp-shadow-sm)] overflow-hidden min-w-0"
  >
    <!-- Claude Agent SDK 风格：顶部实时状态条 -->
    <div
      v-if="statusLine && loading && isLast"
      class="px-4 py-2 border-b border-[var(--dp-border)] bg-[var(--dp-primary-soft)]/40 flex items-center gap-2"
      aria-live="polite"
    >
      <span
        class="inline-block w-2 h-2 rounded-full bg-[var(--dp-primary)] animate-pulse shrink-0"
        aria-hidden="true"
      />
      <span class="text-xs font-mono text-[var(--dp-primary)] truncate">{{ statusLine }}</span>
    </div>

    <!-- 工具/步骤块交错展示（claude-agent-ui ToolUseBlock 思路） -->
    <div
      v-if="activities.length"
      class="px-3 py-2 space-y-1.5 border-b border-[var(--dp-border)]/80"
    >
      <p class="text-[10px] font-semibold text-[var(--dp-text-muted)] uppercase tracking-wide px-1">
        执行流
      </p>
      <AgentActivityItem v-for="a in activities" :key="a.id" :activity="a" />
    </div>

    <!-- 文本流与工具输出同气泡，无单独「任务结果」分区 -->
    <div v-if="assistantResultText(msg)" class="px-4 py-3 min-w-0">
      <div class="flex items-center gap-2 mb-2">
        <AppBadge v-if="loading && isLast && !msg.content" variant="info" pulse>输出中</AppBadge>
        <AppBadge v-else-if="msg.content" variant="success">完成</AppBadge>
      </div>
      <AgentMarkdown :content="assistantResultText(msg)" :streaming="loading && isLast" />
    </div>

    <div
      v-else-if="loading && isLast"
      class="px-4 py-4 text-xs text-[var(--dp-text-muted)]"
      aria-live="polite"
    >
      等待模型输出…
    </div>
  </div>
</template>
