import { tool, type ToolSet } from "ai";
import { listTools, runTool, type ToolSchema } from "../lib/tools";
import { jsonSchemaToZod } from "./jsonSchemaToZod";

export type ConfirmToolFn = (toolId: string, args: Record<string, unknown>) => Promise<boolean>;

export async function buildAgentTools(confirm?: ConfirmToolFn): Promise<ToolSet> {
  const schemas = await listTools();
  const tools: ToolSet = {};

  for (const schema of schemas) {
    tools[schema.id] = createAgentTool(schema, confirm);
  }
  return tools;
}

function createAgentTool(schema: ToolSchema, confirm?: ConfirmToolFn) {
  return tool({
    description: schema.description,
    inputSchema: jsonSchemaToZod(schema.parameters),
    execute: async (args) => {
      const record = args as Record<string, unknown>;
      if (schema.requires_confirmation) {
        const ok = await confirm?.(schema.id, record);
        if (!ok) {
          throw new Error("用户已取消该工具执行");
        }
      }
      const output = await runTool(schema.id, record);
      return {
        message: output.message,
        data: output.data,
      };
    },
  });
}
