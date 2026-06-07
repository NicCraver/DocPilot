import { computed, ref, type Ref } from "vue";
import type { AgentActivity } from "../agent/activities";
import { formatActivityArgs, formatActivityResult, toolFriendlyName } from "../agent/activities";
import { attachmentChips } from "../agent/attachments";
import type { ProviderSettings } from "./useProviderSettings";
import { useAgentChatSession, useAgentChatActions, type ChatMessage } from "./agentChatSession";

export type CraftActivityStatus = "pending" | "running" | "success" | "error";
export type CraftPermissionMode = "ask" | "auto" | "safe";
export type CraftTurnPhase = "pending" | "tool_active" | "awaiting" | "streaming" | "complete";

export const CRAFT_PERMISSION_MODE_ORDER: CraftPermissionMode[] = ["safe", "ask", "auto"];

export const CRAFT_PERMISSION_MODE_LABEL: Record<CraftPermissionMode, string> = {
  safe: "Explore",
  ask: "Ask",
  auto: "Execute",
};

export interface CraftActivity {
  id: string;
  kind: AgentActivity["kind"];
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
  interrupted: boolean;
  phase: CraftTurnPhase;
  showThinkingIndicator: boolean;
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

export function mapAgentActivityToCraft(activity: AgentActivity): CraftActivity {
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
    kind: activity.kind,
    toolName,
    status: activity.status,
    title: activity.toolName ? toolFriendlyName(activity.toolName) : activity.title,
    description: activity.title,
    input,
    output,
    fileName,
  };
}

export function deriveCraftTurnPhase(input: {
  activities: Pick<CraftActivity, "kind" | "status">[];
  response: string;
  streaming: boolean;
  complete: boolean;
}): CraftTurnPhase {
  if (input.complete) return "complete";
  if (input.streaming && input.response.trim()) return "streaming";
  if (input.activities.some((a) => a.kind === "tool" && a.status === "running")) {
    return "tool_active";
  }
  if (input.activities.length > 0) return "awaiting";
  return "pending";
}

export function shouldShowCraftThinkingIndicator(
  phase: CraftTurnPhase,
  isBuffering: boolean,
): boolean {
  return phase === "pending" || phase === "awaiting" || (phase === "streaming" && isBuffering);
}

function assistantTitle(
  msg: ChatMessage,
  phase: CraftTurnPhase,
  activities: CraftActivity[],
): string {
  const running = activities.find((a) => a.kind === "tool" && a.status === "running");
  if (running) return running.title;
  if (msg.interrupted) return "已停止";
  if (phase === "streaming") return "正在生成回复";
  if (phase === "awaiting") return "准备回复";
  if (phase === "complete" && msg.content.trim()) return "任务完成";
  return "Thinking";
}

export function messagesToCraftTurns(messages: ChatMessage[], loading: boolean): CraftTurn[] {
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
    const activities = (msg.activities ?? []).map(mapAgentActivityToCraft);
    const complete = !streaming;
    const phase = deriveCraftTurnPhase({
      activities,
      response,
      streaming,
      complete,
    });
    const isBuffering = streaming && !response.trim();

    turns.push({
      id: `assistant-${i}`,
      type: "assistant",
      title: assistantTitle(msg, phase, activities),
      activities,
      response,
      time: "",
      streaming,
      complete,
      interrupted: Boolean(msg.interrupted),
      phase,
      showThinkingIndicator: shouldShowCraftThinkingIndicator(phase, isBuffering),
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

  const {
    send,
    clear,
    stop: stopSession,
  } = useAgentChatActions(getSettings, {
    confirmTool,
    confirmAllTools: () => permissionMode.value === "ask",
  });

  const turns = computed(() => messagesToCraftTurns(messages.value, loading.value));

  const sessions = computed(() => {
    const firstUser = messages.value.find((m) => m.role === "user");
    const lastAssistant = [...messages.value].reverse().find((m) => m.role === "assistant");
    const preview = loading.value
      ? "正在处理…"
      : lastAssistant?.interrupted
        ? "已停止"
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

  function stop() {
    denyPermission();
    stopSession();
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
    stop,
  };
}
