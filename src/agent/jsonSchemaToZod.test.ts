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

  it("转换 array 类型参数", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      properties: {
        input_paths: { type: "array", items: { type: "string" } },
      },
      required: ["input_paths"],
    });
    const parsed = schema.parse({ input_paths: ["/a.pdf", "/b.pdf"] });
    expect(parsed.input_paths).toHaveLength(2);
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
