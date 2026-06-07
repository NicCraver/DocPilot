import { tool, type ToolSet } from "ai";
import { listTools, runTool, type ToolSchema } from "../lib/tools";
import type { AgentActivity } from "./activities";
import { createActivityId, formatActivityResult, toolFriendlyName } from "./activities";
import { jsonSchemaToZod } from "./jsonSchemaToZod";
import { pushAgentLog } from "./agentLog";
import { resolveToolArgs } from "./pathResolve";

export type ConfirmToolFn = (toolId: string, args: Record<string, unknown>) => Promise<boolean>;
export type OnAgentActivity = (activity: AgentActivity) => void;

export async function buildAgentTools(
  confirm?: ConfirmToolFn,
  onActivity?: OnAgentActivity,
  confirmAll = false,
): Promise<ToolSet> {
  const schemas = await listTools();
  const tools: ToolSet = {};

  for (const schema of schemas) {
    tools[schema.id] = createAgentTool(schema, confirm, onActivity, confirmAll);
  }
  return tools;
}

function createAgentTool(
  schema: ToolSchema,
  confirm?: ConfirmToolFn,
  onActivity?: OnAgentActivity,
  confirmAll = false,
) {
  return tool({
    description: schema.description,
    inputSchema: jsonSchemaToZod(schema.parameters),
    execute: async (args, { abortSignal }) => {
      assertNotAborted(abortSignal);
      let record = args as Record<string, unknown>;
      const actId = createActivityId();
      const label = toolFriendlyName(schema.id);
      onActivity?.({
        id: actId,
        kind: "tool",
        status: "running",
        title: `正在调用：${label}`,
        toolName: schema.id,
        args: record,
      });
      pushAgentLog({
        level: "step",
        title: `开始执行工具「${schema.id}」`,
        detail: JSON.stringify(record, null, 2),
      });
      try {
        record = await resolveToolArgs(schema, record, onActivity);
        assertNotAborted(abortSignal);
        if (schema.requires_confirmation || confirmAll) {
          const ok = await confirm?.(schema.id, record);
          assertNotAborted(abortSignal);
          if (!ok) {
            throw new Error("用户已取消该工具执行");
          }
        }
        assertNotAborted(abortSignal);
        onActivity?.({
          id: actId,
          kind: "tool",
          status: "running",
          title: `正在执行：${label}`,
          toolName: schema.id,
          args: record,
        });
        const output = await runTool(schema.id, record);
        assertNotAborted(abortSignal);
        const detail = output.message ?? formatActivityResult(output);
        pushAgentLog({
          level: "success",
          title: `工具「${schema.id}」执行成功`,
          detail,
        });
        onActivity?.({
          id: actId,
          kind: "tool",
          status: "success",
          title: `已完成：${label}`,
          toolName: schema.id,
          args: record,
          result: output,
          detail,
        });
        return {
          message: output.message,
          data: output.data,
        };
      } catch (e) {
        const err = String(e);
        pushAgentLog({
          level: "error",
          title: `工具「${schema.id}」执行失败`,
          detail: err,
        });
        onActivity?.({
          id: actId,
          kind: "tool",
          status: "error",
          title: `${label} 失败`,
          toolName: schema.id,
          args: record,
          error: err,
        });
        throw e;
      }
    },
  });
}

function assertNotAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw new Error("用户已停止当前任务");
  }
}
