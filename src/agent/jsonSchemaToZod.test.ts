import { describe, it, expect } from "vitest";
import { jsonSchemaToZod } from "./jsonSchemaToZod";

describe("jsonSchemaToZod", () => {
  it("转换 compress_pdf 参数 schema", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      properties: {
        input_path: { type: "string" },
        output_path: { type: "string" },
      },
      required: ["input_path", "output_path"],
    });
    const parsed = schema.parse({
      input_path: "/a.pdf",
      output_path: "/b.pdf",
    });
    expect(parsed.input_path).toBe("/a.pdf");
  });

  it("缺少必填字段时失败", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      properties: { input_path: { type: "string" } },
      required: ["input_path"],
    });
    expect(() => schema.parse({})).toThrow();
  });
});
