import { getCurrentInstance, onUnmounted, ref } from "vue";
import type { AgentLogEntry } from "../agent/agentLog";
import { subscribeAgentLog } from "../agent/agentLog";

export function useAgentLog() {
  const entries = ref<AgentLogEntry[]>([]);

  const unsubscribe = subscribeAgentLog((entry) => {
    entries.value.push(entry);
  });

  if (getCurrentInstance()) {
    onUnmounted(unsubscribe);
  }

  function clear() {
    entries.value = [];
  }

  return { entries, clear };
}
