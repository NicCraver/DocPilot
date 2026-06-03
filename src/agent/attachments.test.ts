import { describe, it, expect } from "vitest";
import { flattenAttachmentPaths, formatUserMessageForModel, attachmentChips } from "./attachments";

describe("attachments", () => {
  it("flattenAttachmentPaths 去重", () => {
    const paths = flattenAttachmentPaths([
      { kind: "file", path: "/a.pdf" },
      { kind: "files", paths: ["/a.pdf", "/b.pdf"] },
    ]);
    expect(paths).toEqual(["/a.pdf", "/b.pdf"]);
  });

  it("formatUserMessageForModel 无附件时仅正文", () => {
    expect(formatUserMessageForModel("压缩 PDF", [])).toBe("压缩 PDF");
  });

  it("formatUserMessageForModel 仅附件时使用默认提示", () => {
    const msg = formatUserMessageForModel("", [{ kind: "file", path: "/x.pdf" }]);
    expect(msg).toContain("请处理以下文件");
    expect(msg).toContain("/x.pdf");
    expect(msg).toContain("【用户已选本地路径】");
  });

  it("attachmentChips 空文件夹显示目录名", () => {
    const chips = attachmentChips([{ kind: "folder", dir: "/empty", paths: [] }]);
    expect(chips[0].label).toContain("文件夹");
    expect(chips[0].path).toBe("/empty");
  });
});
