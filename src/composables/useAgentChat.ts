import { ref } from "vue";
import type { CoreMessage } from "ai";
import { ask } from "@tauri-apps/plugin-dialog";
import { buildAgentTools } from "../agent/registry";
import { runAgentChat, type ToolCallRecord } from "../agent/runner";
import type { ProviderSettings } from "./useProviderSettings";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useAgentChat(getSettings: () => ProviderSettings) {
  const messages = ref<ChatMessage[]>([]);
  const toolCalls = ref<ToolCallRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function confirmTool(toolId: string, args: Record<string, unknown>) {
    const preview = JSON.stringify(args, null, 2);
    return ask(`Agent 将执行工具「${toolId}」，参数：\n${preview}\n\n是否继续？`, {
      title: "确认工具执行",
      kind: "warning",
    });
  }

  function toCoreMessages(): CoreMessage[] {
    return messages.value.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async function send(userText: string) {
    const text = userText.trim();
    if (!text || loading.value) return;

    const settings = getSettings();
    if (!settings.model.trim()) {
      error.value = "请先在设置中配置模型名称";
      return;
    }

    messages.value.push({ role: "user", content: text });
    const assistantIndex = messages.value.length;
    messages.value.push({ role: "assistant", content: "" });
    toolCalls.value = [];
    loading.value = true;
    error.value = null;

    try {
      const tools = await buildAgentTools(confirmTool);
      const reply = await runAgentChat({
        messages: toCoreMessages().slice(0, -1),
        tools,
        settings,
        onTextDelta: (t) => {
          messages.value[assistantIndex].content = t;
        },
        onToolCall: (record) => {
          toolCalls.value.push(record);
        },
      });
      if (!messages.value[assistantIndex].content) {
        messages.value[assistantIndex].content = reply;
      }
    } catch (e) {
      error.value = String(e);
      messages.value[assistantIndex].content =
        messages.value[assistantIndex].content || `出错了：${String(e)}`;
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    messages.value = [];
    toolCalls.value = [];
    error.value = null;
  }

  return { messages, toolCalls, loading, error, send, clear };
}
