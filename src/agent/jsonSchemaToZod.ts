import { z, type ZodTypeAny } from "zod";

function propToZod(prop: Record<string, unknown>): ZodTypeAny {
  switch (prop.type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "integer":
      return z.number().int();
    case "boolean":
      return z.boolean();
    case "array": {
      const items = (prop.items ?? { type: "string" }) as Record<string, unknown>;
      return z.array(propToZod(items));
    }
    default:
      return z.unknown();
  }
}

/** 将后端 ToolSchema.parameters（JSON Schema 子集）转为 Zod，供 Vercel AI SDK tool 使用 */
export function jsonSchemaToZod(schema: Record<string, unknown>): ZodTypeAny {
  if (schema.type !== "object") {
    return z.record(z.string(), z.unknown());
  }
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required ?? []) as string[];
  const shape: Record<string, ZodTypeAny> = {};
  for (const [key, prop] of Object.entries(properties)) {
    let field = propToZod(prop);
    if (!required.includes(key)) {
      field = field.optional();
    }
    shape[key] = field;
  }
  return z.object(shape);
}
