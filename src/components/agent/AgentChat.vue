<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useProviderSettings } from "../../composables/useProviderSettings";
import { useAgentChat } from "../../composables/useAgentChat";
import { useAgentAttachments } from "../../composables/useAgentAttachments";
import { attachmentChips } from "../../agent/attachments";
import AgentLogPanel from "./AgentLogPanel.vue";
import AgentMessageClassic from "./layouts/AgentMessageClassic.vue";
import AgentMessageStream from "./layouts/AgentMessageStream.vue";
import AgentMessageInspector from "./layouts/AgentMessageInspector.vue";
import AgentOrchestrationPanel from "./layouts/AgentOrchestrationPanel.vue";
import AppButton from "../ui/AppButton.vue";
import AppInput from "../ui/AppInput.vue";

export type AgentUiLayout = "classic" | "stream" | "inspector";

const props = withDefaults(
  defineProps<{
    layout?: AgentUiLayout;
  }>(),
  { layout: "classic" },
);

const layoutMeta: Record<
  AgentUiLayout,
  { title: string; subtitle: string; reference: string }
> = {
  classic: {
    title: "经典编排",
    subtitle: "折叠执行过程 + 独立任务结果区（Vercel AI SDK 风格）",
    reference: "DocPilot 默认",
  },
  stream: {
    title: "Claude 流式",
    subtitle: "实时状态条 + 工具块交错 + 同气泡输出（claude-agent-ui）",
    reference: "claude-agent-ui",
  },
  inspector: {
    title: "编排检视器",
    subtitle: "对话精简，右侧管道展示步骤与日志（AgentGUI / CopilotKit）",
    reference: "AgentGUI · CopilotKit",
  },
};

const meta = computed(() => layoutMeta[props.layout]);

const input = ref("");
const chatContainer = ref<HTMLElement | null>(null);
const { settings, loadSettings } = useProviderSettings();
const { messages, loading, error, logs, send, clear } = useAgentChat(() => settings.value);
const {
  chips: pendingChips,
  hasPending,
  addFile,
  addFolder,
  removeChip,
  takePending,
  clear: clearAttachments,
} = useAgentAttachments();

const canSend = computed(
  () => !loading.value && (input.value.trim().length > 0 || hasPending.value),
);

const suggestions = [
  "请帮我压缩这个 PDF 文件：",
  "我想把这两个 PDF 文件合并：",
  "帮我拆分一下这个 PDF 文档，从第 1 页到第 5 页：",
];

/** 检视器模式：展示最后一轮助理的 activities */
const inspectorActivities = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i];
    if (m.role === "assistant" && m.activities?.length) return m.activities;
  }
  return [];
});

const AssistantBody = computed(() => {
  switch (props.layout) {
    case "stream":
      return AgentMessageStream;
    case "inspector":
      return AgentMessageInspector;
    default:
      return AgentMessageClassic;
  }
});

onMounted(() => {
  loadSettings();
  scrollToBottom();
});

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

watch(
  messages,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  },
  { deep: true },
);

async function onSend() {
  if (!canSend.value) return;
  const text = input.value;
  const attachments = takePending();
  input.value = "";
  await send(text, attachments);
}

function applySuggestion(text: string) {
  input.value = text;
}

function onClearChat() {
  clear();
  clearAttachments();
}
</script>

<template>
  <div class="flex gap-4 h-full min-h-0 w-full">
    <div
      class="flex flex-col flex-1 min-w-0 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] shadow-[var(--dp-shadow)] overflow-hidden"
    >
      <div
        class="px-6 py-4 border-b border-[var(--dp-border)] flex items-center justify-between shrink-0 bg-[var(--dp-surface-muted)]"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-10 h-10 rounded-xl bg-[var(--dp-primary)] flex items-center justify-center text-white shrink-0"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.813 15.904L9 21l-.813-5.096a5.48 5.48 0 01-4.138-4.138L1 11l3.049-.813a5.48 5.48 0 014.138-4.138L9 1l.813 5.096a5.48 5.48 0 014.138 4.138L17 11l-3.049.813a5.48 5.48 0 01-4.138 4.138z"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <h2 class="text-sm font-bold text-[var(--dp-text)] truncate">{{ meta.title }}</h2>
            <p class="text-xs text-[var(--dp-text-muted)] truncate">
              {{ meta.subtitle }}
            </p>
            <p class="text-[10px] text-[var(--dp-text-muted)] mt-0.5">
              参考：{{ meta.reference }}
            </p>
          </div>
        </div>

        <AppButton v-if="messages.length" variant="ghost" size="sm" @click="onClearChat">
          清空对话
        </AppButton>
      </div>

      <div
        ref="chatContainer"
        class="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--dp-surface-muted)]/60"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div
          v-if="messages.length === 0"
          class="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-10"
        >
          <h3 class="text-lg font-bold text-[var(--dp-text)]">您好，我是 DocPilot 智能助理</h3>
          <p class="text-sm text-[var(--dp-text-secondary)] mt-2 leading-relaxed">
            当前为「{{ meta.title }}」界面。三种布局共享同一会话，可随时切换侧边栏菜单对比交互。
          </p>

          <div class="w-full mt-8 space-y-2 text-left">
            <p class="text-xs font-semibold text-[var(--dp-text-muted)] uppercase tracking-wide">
              推荐尝试
            </p>
            <div class="grid gap-2">
              <button
                v-for="s in suggestions"
                :key="s"
                type="button"
                class="w-full text-left p-3.5 rounded-xl border border-[var(--dp-border)] bg-white hover:border-[var(--dp-primary)] hover:bg-[var(--dp-primary-soft)]/30 transition-colors duration-200 text-sm text-[var(--dp-text)] flex items-center justify-between gap-3 cursor-pointer min-h-11"
                @click="applySuggestion(s)"
              >
                <span class="truncate">{{ s }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex gap-3"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              v-if="msg.role === 'assistant'"
              class="w-9 h-9 rounded-xl bg-[var(--dp-primary)] flex items-center justify-center text-white shrink-0"
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
                  d="M9.813 15.904L9 21l-.813-5.096a5.48 5.48 0 01-4.138-4.138L1 11l3.049-.813a5.48 5.48 0 014.138-4.138L9 1l.813 5.096a5.48 5.48 0 014.138 4.138L17 11l-3.049.813a5.48 5.48 0 01-4.138 4.138z"
                />
              </svg>
            </div>

            <div
              class="space-y-1.5 min-w-0"
              :class="layout === 'inspector' ? 'max-w-[72%]' : 'max-w-[85%]'"
            >
              <div
                v-if="msg.role === 'user' && msg.attachments?.length"
                class="flex flex-wrap gap-1.5 justify-end"
              >
                <span
                  v-for="(chip, ci) in attachmentChips(msg.attachments)"
                  :key="ci"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-white/20 text-white border border-white/30"
                  :title="chip.path"
                >
                  {{ chip.label }}
                </span>
              </div>
              <div
                class="rounded-2xl text-sm leading-relaxed min-w-0"
                :class="
                  msg.role === 'user'
                    ? 'px-4 py-3 bg-[var(--dp-primary)] text-white rounded-br-md whitespace-pre-wrap'
                    : 'space-y-3'
                "
              >
                <template v-if="msg.role === 'user'">
                  {{ msg.content }}
                </template>
                <component
                  :is="AssistantBody"
                  v-else
                  :msg="msg"
                  :msg-index="i"
                  :message-count="messages.length"
                  :loading="loading"
                />
              </div>
            </div>

            <div
              v-if="msg.role === 'user'"
              class="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 text-xs font-bold"
              aria-hidden="true"
            >
              我
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        role="alert"
        class="mx-6 mb-2 p-3 bg-[var(--dp-danger-soft)] border border-red-200 rounded-xl text-red-800 shrink-0 text-sm"
      >
        {{ error }}
      </div>

      <div class="p-4 border-t border-[var(--dp-border)] shrink-0 bg-white space-y-2">
        <div v-if="pendingChips.length" class="flex flex-wrap gap-2">
          <span
            v-for="(chip, i) in pendingChips"
            :key="`${chip.path}-${i}`"
            class="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-xs bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] text-[var(--dp-text)] max-w-full"
            :title="chip.path"
          >
            <span class="truncate max-w-[12rem]">{{ chip.label }}</span>
            <button
              type="button"
              class="p-0.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
              :aria-label="`移除 ${chip.label}`"
              @click="removeChip(chip.path)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
        <form class="flex gap-2 items-center w-full" @submit.prevent="onSend">
          <div class="flex gap-1 shrink-0">
            <button
              type="button"
              class="flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--dp-border)] text-[var(--dp-text-muted)] hover:bg-[var(--dp-surface-muted)] cursor-pointer disabled:opacity-40"
              :disabled="loading"
              title="添加文件"
              aria-label="添加文件"
              @click="addFile"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01L12 15"
                />
              </svg>
            </button>
            <button
              type="button"
              class="flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--dp-border)] text-[var(--dp-text-muted)] hover:bg-[var(--dp-surface-muted)] cursor-pointer disabled:opacity-40"
              :disabled="loading"
              title="选择文件夹"
              aria-label="选择文件夹"
              @click="addFolder"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                />
              </svg>
            </button>
          </div>
          <AppInput
            v-model="input"
            class="flex-1 min-w-0"
            placeholder="描述您想对 PDF 进行的操作…"
            :disabled="loading"
            autocomplete="off"
          />
          <button
            type="submit"
            class="flex items-center justify-center w-11 h-11 bg-[var(--dp-primary)] hover:bg-[var(--dp-primary-hover)] text-white rounded-xl disabled:opacity-40 cursor-pointer shrink-0"
            :disabled="!canSend"
            aria-label="发送消息"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-4 h-4"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>

    <AgentOrchestrationPanel
      v-if="layout === 'inspector'"
      :activities="inspectorActivities"
      :logs="logs"
      :loading="loading"
    />
    <AgentLogPanel v-else-if="layout === 'classic'" :entries="logs" :loading="loading" />
  </div>
</template>
