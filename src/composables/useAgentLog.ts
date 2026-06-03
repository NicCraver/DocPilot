import { ref, onUnmounted } from "vue";
import type { AgentLogEntry } from "../agent/agentLog";
import { subscribeAgentLog } from "../agent/agentLog";

export function useAgentLog() {
  const entries = ref<AgentLogEntry[]>([]);

  const unsubscribe = subscribeAgentLog((entry) => {
    entries.value.push(entry);
  });

  onUnmounted(unsubscribe);

  function clear() {
    entries.value = [];
  }

  return { entries, clear };
}
