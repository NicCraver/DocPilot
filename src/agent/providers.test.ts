import { describe, it, expect } from "vitest";
import { createChatModel } from "./providers";

describe("createChatModel", () => {
  it("使用配置构造 model 实例", () => {
    const model = createChatModel({
      baseURL: "http://localhost:11434/v1",
      apiKey: "ollama",
      model: "llama3.2",
    });
    expect(model).toBeDefined();
    expect(model.modelId).toBe("llama3.2");
  });
});
