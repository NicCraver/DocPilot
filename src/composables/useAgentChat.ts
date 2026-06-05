import type { ProviderSettings } from "./useProviderSettings";
import {
  useAgentChatSession,
  useAgentChatActions,
  type ChatMessage,
} from "./agentChatSession";

export type { ChatMessage };

export function useAgentChat(getSettings: () => ProviderSettings) {
  const { messages, loading, error, logs } = useAgentChatSession();
  const { send, clear } = useAgentChatActions(getSettings);
  return { messages, loading, error, logs, send, clear };
}
