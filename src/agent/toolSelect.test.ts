import { describe, it, expect } from "vitest";
import { tool } from "ai";
import { z } from "zod";
import { lastUserTextFromMessages, selectToolsForUserText } from "./toolSelect";

function stubTool(id: string) {
  return tool({
    description: id,
    inputSchema: z.object({}),
    execute: async () => ({}),
  });
}

describe("selectToolsForUserText", () => {
  it("压缩意图只保留 compress 相关工具", () => {
    const all = {
      compress_pdf: stubTool("compress_pdf"),
      merge_pdf: stubTool("merge_pdf"),
      get_pdf_info: stubTool("get_pdf_info"),
    };
    const picked = selectToolsForUserText(all, "请帮我压缩这个 PDF");
    expect(Object.keys(picked).sort()).toEqual(["compress_pdf", "get_pdf_info"]);
  });

  it("无匹配意图时返回全部工具", () => {
    const all = { a: stubTool("a"), b: stubTool("b") };
    expect(selectToolsForUserText(all, "你好")).toBe(all);
  });
});

describe("lastUserTextFromMessages", () => {
  it("取最后一条 user 字符串内容", () => {
    const text = lastUserTextFromMessages([
      { role: "user", content: "压缩" },
      { role: "assistant", content: "好" },
      { role: "user", content: "请压缩 /a.pdf" },
    ]);
    expect(text).toBe("请压缩 /a.pdf");
  });
});
