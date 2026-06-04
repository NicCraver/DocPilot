import type { ProviderSettings } from "../composables/useProviderSettings";

function envString(key: keyof ImportMetaEnv): string | undefined {
  const raw = import.meta.env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

/** 从 Vite 环境变量读取的大模型配置（未设置的键为 undefined） */
export function providerSettingsFromEnv(): Partial<ProviderSettings> {
  const out: Partial<ProviderSettings> = {};
  const baseURL = envString("VITE_LLM_BASE_URL");
  const apiKey = envString("VITE_LLM_API_KEY");
  const model = envString("VITE_LLM_MODEL");
  if (baseURL) out.baseURL = baseURL;
  if (apiKey) out.apiKey = apiKey;
  if (model) out.model = model;
  return out;
}

/** 是否由 .env 接管配置（至少设置了模型名） */
export function isProviderConfiguredByEnv(): boolean {
  return Boolean(envString("VITE_LLM_MODEL"));
}
