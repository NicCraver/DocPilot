import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderSettings } from "../composables/useProviderSettings";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export function createChatModel(settings: ProviderSettings) {
  const baseURL = settings.baseURL.trim() || DEFAULT_BASE_URL;
  const provider = createOpenAI({
    baseURL,
    apiKey: settings.apiKey || "ollama",
  });
  const modelId = settings.model.trim() || "gpt-4o-mini";
  return provider(modelId);
}
