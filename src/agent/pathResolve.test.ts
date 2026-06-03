import { describe, it, expect, vi, beforeEach } from "vitest";

const { pathExistsMock, pickAgentFileMock, pickAgentFilesMock } = vi.hoisted(() => ({
  pathExistsMock: vi.fn(),
  pickAgentFileMock: vi.fn(),
  pickAgentFilesMock: vi.fn(),
}));

vi.mock("../lib/tools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tools")>();
  return {
    ...actual,
    pathExists: pathExistsMock,
  };
});

vi.mock("./filePicker", () => ({
  pickAgentFile: pickAgentFileMock,
  pickAgentFiles: pickAgentFilesMock,
}));

import { resolveToolArgs } from "./pathResolve";

const compressSchema = {
  id: "compress_pdf",
  description: "压缩",
  parameters: {
    type: "object",
    properties: {
      input_path: { type: "string" },
      output_path: { type: "string" },
    },
    required: ["input_path", "output_path"],
  },
  requires_confirmation: false,
};

describe("resolveToolArgs", () => {
  beforeEach(() => {
    pathExistsMock.mockReset();
    pickAgentFileMock.mockReset();
    pickAgentFilesMock.mockReset();
  });

  it("input_path 缺失时弹出单文件选择", async () => {
    pathExistsMock.mockResolvedValue(false);
    pickAgentFileMock.mockResolvedValue("/picked.pdf");

    const out = await resolveToolArgs(compressSchema, {
      input_path: "",
      output_path: "/out.pdf",
    });

    expect(pickAgentFileMock).toHaveBeenCalled();
    expect(out.input_path).toBe("/picked.pdf");
  });

  it("input_paths 缺失时弹出多文件选择", async () => {
    const mergeSchema = {
      ...compressSchema,
      id: "merge_pdf",
      parameters: {
        type: "object",
        properties: {
          input_paths: { type: "array", items: { type: "string" } },
          output_path: { type: "string" },
        },
        required: ["input_paths", "output_path"],
      },
    };
    pickAgentFilesMock.mockResolvedValue(["/a.pdf", "/b.pdf"]);

    const out = await resolveToolArgs(mergeSchema, {
      input_paths: [],
      output_path: "/out.pdf",
    });

    expect(pickAgentFilesMock).toHaveBeenCalled();
    expect(out.input_paths).toEqual(["/a.pdf", "/b.pdf"]);
  });
});
