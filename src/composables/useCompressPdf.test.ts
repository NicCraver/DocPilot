import { describe, it, expect, vi } from "vitest";

const { runToolMock, openMock } = vi.hoisted(() => ({
  runToolMock: vi.fn(),
  openMock: vi.fn(),
}));

vi.mock("../lib/tools", () => ({ runTool: runToolMock }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: openMock }));

import { useCompressPdf } from "./useCompressPdf";

describe("useCompressPdf", () => {
  it("选择文件并压缩后更新结果", async () => {
    openMock.mockResolvedValueOnce("/tmp/in.pdf");
    runToolMock.mockResolvedValue({
      data: { before_size: 1000, after_size: 400, output_path: "/tmp/out.pdf" },
      message: "ok",
    });

    const { inputPath, result, pickFile, compress } = useCompressPdf();
    await pickFile();
    expect(inputPath.value).toBe("/tmp/in.pdf");
    await compress();

    expect(runToolMock).toHaveBeenCalledWith(
      "compress_pdf",
      expect.objectContaining({ input_path: "/tmp/in.pdf" }),
    );
    expect(result.value?.after).toBe(400);
  });
});
