export type AgentLogLevel = "info" | "step" | "success" | "warn" | "error";

export interface AgentLogEntry {
  id: string;
  at: number;
  level: AgentLogLevel;
  title: string;
  detail?: string;
}

type AgentLogListener = (entry: AgentLogEntry) => void;

let seq = 0;
const listeners = new Set<AgentLogListener>();

export function subscribeAgentLog(listener: AgentLogListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pushAgentLog(entry: Omit<AgentLogEntry, "id" | "at">): AgentLogEntry {
  const full: AgentLogEntry = {
    id: String(++seq),
    at: Date.now(),
    ...entry,
  };
  for (const listener of listeners) listener(full);
  return full;
}

export function formatLogTime(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export const LOG_LEVEL_LABEL: Record<AgentLogLevel, string> = {
  info: "信息",
  step: "步骤",
  success: "成功",
  warn: "注意",
  error: "错误",
};
