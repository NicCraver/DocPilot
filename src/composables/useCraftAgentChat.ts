import { computed, ref, type Ref } from "vue";
import type { AgentActivity } from "../agent/activities";
import { formatActivityArgs, formatActivityResult, toolFriendlyName } from "../agent/activities";
import { attachmentChips } from "../agent/attachments";
import type { ProviderSettings } from "./useProviderSettings";
import { useAgentChatSession, useAgentChatActions, type ChatMessage } from "./agentChatSession";

export type CraftActivityStatus = "pending" | "running" | "success" | "error";
export type CraftPermissionMode = "ask" | "auto" | "safe";

export interface CraftActivity {
  id: string;
  toolName: string;
  status: CraftActivityStatus;
  title: string;
  description?: string;
  input?: string;
  output?: string;
  fileName?: string;
  elapsed?: string;
}

export interface CraftUserTurn {
  id: string;
  type: "user";
  content: string;
  time: string;
  attachments?: string[];
}

export interface CraftAssistantTurn {
  id: string;
  type: "assistant";
  title: string;
  activities: CraftActivity[];
  response: string;
  time: string;
  streaming: boolean;
  complete: boolean;
  expanded: boolean;
}

export type CraftTurn = CraftUserTurn | CraftAssistantTurn;

export interface CraftPermissionRequest {
  toolId: string;
  toolLabel: string;
  args: Record<string, unknown>;
  resolve: (allowed: boolean) => void;
}

const READ_ONLY_TOOLS = new Set([
  "get_pdf_info",
  "get_file_info",
  "get_image_info",
  "compute_hash",
]);

function mapAgentActivity(activity: AgentActivity): CraftActivity {
  const toolName = activity.toolName ?? activity.kind;
  const input =
    activity.args != null
      ? formatActivityArgs(activity.args)
      : activity.detail && activity.kind === "file"
        ? activity.detail
        : undefined;
  const output =
    activity.error ??
    (activity.result != null
      ? formatActivityResult(activity.result)
      : activity.detail && activity.kind !== "file"
        ? activity.detail
        : undefined);

  let fileName: string | undefined;
  if (activity.args && typeof activity.args === "object") {
    const args = activity.args as Record<string, unknown>;
    const path =
      (args.input_path as string) ||
      (args.output_path as string) ||
      (args.path as string) ||
      (Array.isArray(args.input_paths) ? (args.input_paths[0] as string) : undefined);
    if (path) {
      const parts = path.split(/[/\\]/);
      fileName = parts[parts.length - 1];
    }
  }

  return {
    id: activity.id,
    toolName,
    status: activity.status,
    title: activity.toolName ? toolFriendlyName(activity.toolName) : activity.title,
    description: activity.title,
    input,
    output,
    fileName,
  };
}

function assistantTitle(msg: ChatMessage, streaming: boolean): string {
  const running = msg.activities?.find((a) => a.status === "running");
  if (running) return running.title;
  if (streaming) return "正在生成回复";
  if (msg.content.trim()) return "任务完成";
  return "处理中";
}

function messagesToTurns(messages: ChatMessage[], loading: boolean): CraftTurn[] {
  const turns: CraftTurn[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      turns.push({
        id: `user-${i}`,
        type: "user",
        content: msg.content,
        attachments: msg.attachments
          ? attachmentChips(msg.attachments).map((c) => c.label)
          : undefined,
        time: "",
      });
      continue;
    }

    const isLast = i === messages.length - 1;
    const streaming = isLast && loading;
    const response = streaming ? (msg.draftContent ?? msg.content) : msg.content;

    turns.push({
      id: `assistant-${i}`,
      type: "assistant",
      title: assistantTitle(msg, streaming),
      activities: (msg.activities ?? []).map(mapAgentActivity),
      response,
      time: "",
      streaming,
      complete: !streaming && Boolean(msg.content?.trim()),
      expanded: isLast || streaming,
    });
  }
  return turns;
}

export function useCraftAgentChat(
  getSettings: () => ProviderSettings,
  permissionMode: Ref<CraftPermissionMode>,
) {
  const pendingPermission = ref<CraftPermissionRequest | null>(null);
  const { messages, loading, error, logs } = useAgentChatSession();

  const confirmTool = async (toolId: string, args: Record<string, unknown>) => {
    if (permissionMode.value === "auto") return true;
    if (permissionMode.value === "safe" && !READ_ONLY_TOOLS.has(toolId)) return false;

    return new Promise<boolean>((resolve) => {
      pendingPermission.value = {
        toolId,
        toolLabel: toolFriendlyName(toolId),
        args,
        resolve,
      };
    });
  };

  const { send, clear } = useAgentChatActions(getSettings, {
    confirmTool,
    confirmAllTools: () => permissionMode.value === "ask",
  });

  const turns = computed(() => messagesToTurns(messages.value, loading.value));

  const sessions = computed(() => {
    const firstUser = messages.value.find((m) => m.role === "user");
    const lastAssistant = [...messages.value].reverse().find((m) => m.role === "assistant");
    const preview = loading.value
      ? "正在处理…"
      : lastAssistant?.content?.slice(0, 40) || "发送消息开始对话";
    return [
      {
        id: "current",
        title: firstUser?.content.slice(0, 24) || "新对话",
        preview,
        state: loading.value
          ? ("active" as const)
          : messages.value.length
            ? ("done" as const)
            : ("queued" as const),
        label: "PDF",
      },
    ];
  });

  function denyPermission() {
    pendingPermission.value?.resolve(false);
    pendingPermission.value = null;
  }

  function allowPermission(alwaysAllow = false) {
    if (alwaysAllow) permissionMode.value = "auto";
    pendingPermission.value?.resolve(true);
    pendingPermission.value = null;
  }

  return {
    messages,
    turns,
    sessions,
    loading,
    error,
    logs,
    send,
    clear,
    pendingPermission,
    denyPermission,
    allowPermission,
  };
}
