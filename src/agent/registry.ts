import { tool, type ToolSet } from "ai";
import { listTools, runTool, type ToolSchema } from "../lib/tools";
import { jsonSchemaToZod } from "./jsonSchemaToZod";
import { pushAgentLog } from "./agentLog";
import { resolveToolArgs } from "./pathResolve";

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
      let record = args as Record<string, unknown>;
      pushAgentLog({
        level: "step",
        title: `开始执行工具「${schema.id}」`,
        detail: JSON.stringify(record, null, 2),
      });
      try {
        record = await resolveToolArgs(schema, record);
        if (schema.requires_confirmation) {
          const ok = await confirm?.(schema.id, record);
          if (!ok) {
            throw new Error("用户已取消该工具执行");
          }
        }
        const output = await runTool(schema.id, record);
        pushAgentLog({
          level: "success",
          title: `工具「${schema.id}」执行成功`,
          detail: output.message ?? JSON.stringify(output.data, null, 2),
        });
        return {
          message: output.message,
          data: output.data,
        };
      } catch (e) {
        pushAgentLog({
          level: "error",
          title: `工具「${schema.id}」执行失败`,
          detail: String(e),
        });
        throw e;
      }
    },
  });
}
