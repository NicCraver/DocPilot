import { ref } from "vue";
import type { ModelMessage } from "ai";
import { ask } from "@tauri-apps/plugin-dialog";
import type { AgentActivity } from "../agent/activities";
import { createActivityId } from "../agent/activities";
import { buildAgentTools } from "../agent/registry";
import { pushAgentLog } from "../agent/agentLog";
import { runAgentChat } from "../agent/runner";
import type { ProviderSettings } from "./useProviderSettings";
import type { AgentAttachment } from "../agent/attachments";
import { flattenAttachmentPaths, formatUserMessageForModel } from "../agent/attachments";
import { useAgentLog } from "./useAgentLog";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: AgentAttachment[];
  /** 执行过程（读文件、调工具等），默认折叠 */
  activities?: AgentActivity[];
  /** 流式生成中的中间文稿，完成后写入 content */
  draftContent?: string;
}

function upsertActivity(msg: ChatMessage, activity: AgentActivity) {
  if (!msg.activities) msg.activities = [];
  const idx = msg.activities.findIndex((a) => a.id === activity.id);
  if (idx >= 0) {
    msg.activities[idx] = { ...msg.activities[idx], ...activity };
  } else {
    msg.activities.push(activity);
  }
}

export function useAgentChat(getSettings: () => ProviderSettings) {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const { entries: logs, clear: clearLogs } = useAgentLog();

  async function confirmTool(toolId: string, args: Record<string, unknown>) {
    const preview = JSON.stringify(args, null, 2);
    pushAgentLog({
      level: "warn",
      title: `等待确认：${toolId}`,
      detail: preview,
    });
    const ok = await ask(`Agent 将执行工具「${toolId}」，参数：\n${preview}\n\n是否继续？`, {
      title: "确认工具执行",
      kind: "warning",
    });
    pushAgentLog({
      level: ok ? "info" : "warn",
      title: ok ? `用户已确认「${toolId}」` : `用户取消「${toolId}」`,
    });
    return ok;
  }

  function toModelMessages(): ModelMessage[] {
    return messages.value.map((m) => ({
      role: m.role,
      content:
        m.role === "user" && m.attachments?.length
          ? formatUserMessageForModel(m.content, m.attachments)
          : m.content,
    }));
  }

  async function send(userText: string, attachments: AgentAttachment[] = []) {
    const text = userText.trim();
    const hasAttachments = attachments.length > 0;
    if ((!text && !hasAttachments) || loading.value) return;

    const settings = getSettings();
    if (!settings.model.trim()) {
      error.value = "请先在设置中配置模型名称";
      pushAgentLog({ level: "error", title: "发送失败", detail: error.value });
      return;
    }

    const displayContent = text || (hasAttachments ? "请处理以下文件。" : "");
    const pathCount = flattenAttachmentPaths(attachments).length;
    pushAgentLog({
      level: "info",
      title: "用户发送消息",
      detail: [
        displayContent,
        pathCount ? `附件 ${pathCount} 个路径` : null,
        `模型：${settings.model}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    messages.value.push({
      role: "user",
      content: displayContent,
      attachments: hasAttachments ? attachments : undefined,
    });
    const assistantIndex = messages.value.length;
    const prepareId = createActivityId();
    messages.value.push({
      role: "assistant",
      content: "",
      draftContent: "",
      activities: [
        {
          id: prepareId,
          kind: "prepare",
          status: "running",
          title: "正在连接模型并加载工具…",
        },
      ],
    });
    loading.value = true;
    error.value = null;

    const assistantMsg = () => messages.value[assistantIndex];

    const onActivity = (activity: AgentActivity) => {
      upsertActivity(assistantMsg(), activity);
    };

    try {
      pushAgentLog({ level: "step", title: "正在加载工具并连接模型…" });
      const tools = await buildAgentTools(confirmTool, onActivity);
      const toolCount = Object.keys(tools).length;
      upsertActivity(assistantMsg(), {
        id: prepareId,
        kind: "prepare",
        status: "success",
        title: `已就绪 · ${toolCount} 个工具可用`,
      });
      pushAgentLog({
        level: "info",
        title: "工具注册完成",
        detail: `共 ${toolCount} 个工具可用`,
      });

      if (pathCount > 0) {
        const paths = flattenAttachmentPaths(attachments);
        onActivity({
          id: createActivityId(),
          kind: "file",
          status: "success",
          title: `已读取附件 · ${pathCount} 个文件`,
          detail: paths.join("\n"),
        });
      }

      const reply = await runAgentChat({
        messages: toModelMessages().slice(0, -1),
        tools,
        settings,
        onTextDelta: (t) => {
          assistantMsg().draftContent = t;
        },
      });

      const final =
        reply.trim() ||
        assistantMsg().draftContent?.trim() ||
        "未收到有效回复。请添加 PDF 附件后重试，或检查大模型配置。";
      assistantMsg().content = final;
      assistantMsg().draftContent = "";
      pushAgentLog({ level: "success", title: "本轮智能体任务结束" });
    } catch (e) {
      error.value = String(e);
      assistantMsg().content =
        assistantMsg().draftContent?.trim() || assistantMsg().content || `出错了：${String(e)}`;
      assistantMsg().draftContent = "";
      upsertActivity(assistantMsg(), {
        id: prepareId,
        kind: "prepare",
        status: "error",
        title: "智能体运行失败",
        error: String(e),
      });
      pushAgentLog({ level: "error", title: "智能体运行出错", detail: String(e) });
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    messages.value = [];
    error.value = null;
    clearLogs();
  }

  return { messages, loading, error, logs, send, clear };
}
