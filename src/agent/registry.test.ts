import { describe, it, expect, vi, beforeEach } from "vitest";

const { listToolsMock, runToolMock } = vi.hoisted(() => ({
  listToolsMock: vi.fn(),
  runToolMock: vi.fn(),
}));

vi.mock("../lib/tools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tools")>();
  return {
    ...actual,
    listTools: listToolsMock,
    runTool: runToolMock,
    pathExists: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("./filePicker", () => ({
  pickAgentFile: vi.fn(),
  pickAgentFiles: vi.fn(),
}));

import { buildAgentTools } from "./registry";

describe("buildAgentTools", () => {
  beforeEach(() => {
    listToolsMock.mockReset();
    runToolMock.mockReset();
  });

  it("从 list_tools 动态注册工具并执行", async () => {
    listToolsMock.mockResolvedValue([
      {
        id: "compress_pdf",
        description: "压缩 PDF",
        parameters: {
          type: "object",
          properties: {
            input_path: { type: "string" },
            output_path: { type: "string" },
          },
          required: ["input_path", "output_path"],
        },
        requires_confirmation: false,
      },
    ]);
    runToolMock.mockResolvedValue({
      message: "ok",
      data: { after_size: 1 },
    });

    const tools = await buildAgentTools();
    const compress = tools.compress_pdf;
    expect(compress).toBeDefined();
    if (!compress || !("execute" in compress) || !compress.execute) {
      throw new Error("compress_pdf tool missing execute");
    }
    const result = await compress.execute(
      { input_path: "/in.pdf", output_path: "/out.pdf" },
      { toolCallId: "1", messages: [] },
    );
    expect(runToolMock).toHaveBeenCalledWith("compress_pdf", {
      input_path: "/in.pdf",
      output_path: "/out.pdf",
    });
    expect(result).toMatchObject({ message: "ok" });
  });

  it("requires_confirmation 时先确认再执行", async () => {
    listToolsMock.mockResolvedValue([
      {
        id: "danger",
        description: "危险",
        parameters: { type: "object", properties: {} },
        requires_confirmation: true,
      },
    ]);
    const confirm = vi.fn().mockResolvedValue(false);
    const tools = await buildAgentTools(confirm);
    const danger = tools.danger;
    if (!danger || !("execute" in danger) || !danger.execute) {
      throw new Error("danger tool missing execute");
    }
    await expect(danger.execute({}, { toolCallId: "1", messages: [] })).rejects.toThrow(
      "用户已取消",
    );
    expect(runToolMock).not.toHaveBeenCalled();
  });
});
