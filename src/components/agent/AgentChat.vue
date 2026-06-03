<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useProviderSettings } from "../../composables/useProviderSettings";
import { useAgentChat } from "../../composables/useAgentChat";
import ToolCallCard from "./ToolCallCard.vue";

const input = ref("");
const { settings, loadSettings } = useProviderSettings();
const { messages, toolCalls, loading, error, send, clear } = useAgentChat(() => settings.value);

onMounted(() => {
  loadSettings();
});

async function onSend() {
  const text = input.value;
  input.value = "";
  await send(text);
}
</script>

<template>
  <section class="border rounded p-4 flex flex-col max-w-2xl h-[32rem]">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-semibold">Agent</h2>
      <button type="button" class="text-sm text-gray-500 underline" @click="clear">清空</button>
    </div>

    <div class="flex-1 overflow-y-auto space-y-3 mb-3">
      <p v-if="messages.length === 0" class="text-sm text-gray-500">
        用自然语言描述任务，例如：「请把 /path/to/file.pdf 压缩，输出到同目录」
      </p>
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="msg.role === 'user' ? 'text-right' : 'text-left'"
      >
        <span
          class="inline-block px-3 py-2 rounded text-sm max-w-[90%] whitespace-pre-wrap"
          :class="msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'"
        >
          {{ msg.content || (loading && i === messages.length - 1 ? "…" : "") }}
        </span>
      </div>
      <ToolCallCard v-for="(tc, j) in toolCalls" :key="j" :record="tc" />
    </div>

    <p v-if="error" class="text-red-600 text-sm mb-2">{{ error }}</p>

    <form class="flex gap-2" @submit.prevent="onSend">
      <input
        v-model="input"
        class="flex-1 border rounded px-2 py-1 text-sm"
        placeholder="输入消息…"
        :disabled="loading"
      />
      <button
        type="submit"
        class="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        :disabled="loading || !input.trim()"
      >
        {{ loading ? "处理中" : "发送" }}
      </button>
    </form>
  </section>
</template>
