<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useProviderSettings } from "../../composables/useProviderSettings";
import { useAgentChat, type ChatMessage } from "../../composables/useAgentChat";
import { useAgentAttachments } from "../../composables/useAgentAttachments";
import { attachmentChips } from "../../agent/attachments";
import AgentActivityTimeline from "./AgentActivityTimeline.vue";
import AgentMarkdown from "./AgentMarkdown.vue";
import AgentLogPanel from "./AgentLogPanel.vue";
import AppButton from "../ui/AppButton.vue";
import AppInput from "../ui/AppInput.vue";

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

/** 流式中的文稿或已定稿内容 */
function assistantResultText(msg: ChatMessage): string {
  return msg.content || msg.draftContent || "";
}

function isLastAssistant(index: number): boolean {
  return messages.value[index]?.role === "assistant" && index === messages.value.length - 1;
}
</script>

<template>
  <div class="flex gap-4 h-full min-h-0 w-full">
    <div
      class="flex flex-col flex-1 min-w-0 bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] shadow-[var(--dp-shadow)] overflow-hidden"
    >
      <!-- 顶栏 -->
      <div
        class="px-6 py-4 border-b border-[var(--dp-border)] flex items-center justify-between shrink-0 bg-[var(--dp-surface-muted)]"
      >
        <div class="flex items-center gap-3">
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
          <div>
            <h2 class="text-sm font-bold text-[var(--dp-text)]">DocPilot AI 助理</h2>
            <p class="text-xs text-[var(--dp-text-muted)]">
              支持自然语言执行 PDF 压缩、合并、拆分等操作
            </p>
          </div>
        </div>

        <AppButton v-if="messages.length" variant="ghost" size="sm" @click="onClearChat">
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
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          清空对话
        </AppButton>
      </div>

      <!-- 消息区 -->
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
          <div
            class="w-14 h-14 rounded-2xl bg-[var(--dp-primary)] flex items-center justify-center text-white mb-5"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-7 h-7"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-[var(--dp-text)]">您好，我是 DocPilot 智能助理</h3>
          <p class="text-sm text-[var(--dp-text-secondary)] mt-2 leading-relaxed">
            用自然语言描述您要对 PDF 做的操作即可。例如：
            <code
              class="block mt-2 font-mono text-xs bg-white border border-[var(--dp-border)] px-3 py-2 rounded-lg text-slate-700"
            >
              请把 /path/to/file.pdf 压缩，输出到同目录
            </code>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="w-4 h-4 text-slate-400 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
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

            <div class="space-y-1.5 max-w-[85%]">
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
                <template v-else>
                  <AgentActivityTimeline
                    v-if="msg.activities?.length"
                    :activities="msg.activities"
                    :loading="loading && i === messages.length - 1"
                  />

                  <div
                    v-if="assistantResultText(msg)"
                    class="px-4 py-3 bg-white border border-[var(--dp-border)] text-[var(--dp-text)] rounded-bl-md shadow-[var(--dp-shadow-sm)]"
                  >
                    <p
                      class="text-[10px] font-semibold uppercase tracking-wide mb-2"
                      :class="
                        loading && isLastAssistant(i) && !msg.content
                          ? 'text-[var(--dp-primary)]'
                          : 'text-[var(--dp-success)]'
                      "
                    >
                      {{
                        loading && isLastAssistant(i) && !msg.content
                          ? "正在生成结果"
                          : "任务结果"
                      }}
                    </p>
                    <AgentMarkdown
                      :content="assistantResultText(msg)"
                      :streaming="loading && isLastAssistant(i)"
                    />
                  </div>

                  <div
                    v-else-if="loading && isLastAssistant(i)"
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
        class="mx-6 mb-2 p-3 bg-[var(--dp-danger-soft)] border border-red-200 rounded-xl flex items-start gap-2 text-red-800 shrink-0 text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="w-4 h-4 shrink-0 mt-0.5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
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
              class="flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--dp-border)] text-[var(--dp-text-muted)] hover:bg-[var(--dp-surface-muted)] hover:text-[var(--dp-primary)] transition-colors disabled:opacity-40 cursor-pointer"
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
              class="flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--dp-border)] text-[var(--dp-text-muted)] hover:bg-[var(--dp-surface-muted)] hover:text-[var(--dp-primary)] transition-colors disabled:opacity-40 cursor-pointer"
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
            placeholder="描述您想对 PDF 进行的操作，可先添加文件或文件夹…"
            :disabled="loading"
            autocomplete="off"
          />
          <button
            type="submit"
            class="flex items-center justify-center w-11 h-11 min-w-11 bg-[var(--dp-primary)] hover:bg-[var(--dp-primary-hover)] text-white rounded-xl transition-colors duration-200 disabled:opacity-40 cursor-pointer shrink-0"
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

    <AgentLogPanel :entries="logs" :loading="loading" />
  </div>
</template>
