import { describe, it, expect } from "vitest";
import { buildAttachmentContextHint } from "./contextHint";

describe("buildAttachmentContextHint", () => {
  it("有路径块时要求使用真实路径", () => {
    const hint = buildAttachmentContextHint([
      {
        role: "user",
        content: "请压缩\n\n---\n【用户已选本地路径】\n- /tmp/a.pdf",
      },
    ]);
    expect(hint).toContain("/tmp/a.pdf");
    expect(hint).toContain("compress_pdf");
  });

  it("无路径时提示用户添加文件", () => {
    const hint = buildAttachmentContextHint([{ role: "user", content: "请压缩 PDF" }]);
    expect(hint).toContain("未附带");
  });
});
