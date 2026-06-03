import { describe, it, expect, vi, beforeEach } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import { runTool, listTools } from "./tools";

describe("tools 封装", () => {
  beforeEach(() => invokeMock.mockReset());

  it("runTool 透传 id 与 args 给 run_tool", async () => {
    invokeMock.mockResolvedValue({ data: { after_size: 10 }, message: "ok" });
    const res = await runTool("compress_pdf", {
      input_path: "a",
      output_path: "b",
    });
    expect(invokeMock).toHaveBeenCalledWith("run_tool", {
      id: "compress_pdf",
      input: { args: { input_path: "a", output_path: "b" } },
    });
    expect(res.message).toBe("ok");
  });

  it("listTools 调用 list_tools", async () => {
    invokeMock.mockResolvedValue([{ id: "compress_pdf" }]);
    const tools = await listTools();
    expect(invokeMock).toHaveBeenCalledWith("list_tools");
    expect(tools[0].id).toBe("compress_pdf");
  });
});
