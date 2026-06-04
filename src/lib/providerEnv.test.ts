import { describe, it, expect, vi, afterEach } from "vitest";

describe("providerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("providerSettingsFromEnv 读取 VITE_LLM_*", async () => {
    vi.stubEnv("VITE_LLM_BASE_URL", "https://api.example.com/v1");
    vi.stubEnv("VITE_LLM_API_KEY", "sk-test");
    vi.stubEnv("VITE_LLM_MODEL", "gpt-4o");
    vi.resetModules();
    const { providerSettingsFromEnv, isProviderConfiguredByEnv } = await import("./providerEnv");
    expect(providerSettingsFromEnv()).toEqual({
      baseURL: "https://api.example.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o",
    });
    expect(isProviderConfiguredByEnv()).toBe(true);
  });
});
