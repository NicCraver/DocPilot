import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderSettings } from "../composables/useProviderSettings";

export function createChatModel(settings: ProviderSettings) {
  const modelId = settings.model.trim();
  const baseURL = settings.baseURL.trim();
  if (!modelId) {
    throw new Error("未配置模型：请在 .env 设置 VITE_LLM_MODEL 或在系统设置中保存");
  }
  if (!baseURL) {
    throw new Error("未配置接口地址：请在 .env 设置 VITE_LLM_BASE_URL");
  }
  const provider = createOpenAI({
    baseURL,
    apiKey: settings.apiKey.trim() || "ollama",
  });
  // 智谱 GLM、Ollama 等 OpenAI 兼容接口走 /chat/completions；provider() 默认走 Responses API 会空回复
  return provider.chat(modelId);
}
