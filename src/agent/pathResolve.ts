import type { ToolSchema } from "../lib/tools";
import { pathExists } from "../lib/tools";
import type { AgentActivity } from "./activities";
import { basename } from "./attachments";
import { createActivityId } from "./activities";
import { pushAgentLog } from "./agentLog";
import { pickAgentFile, pickAgentFiles } from "./filePicker";

export type OnAgentActivity = (activity: AgentActivity) => void;

const INPUT_PATH_KEYS = new Set(["input_path", "path", "src"]);
const INPUT_PATH_ARRAY_KEYS = new Set(["input_paths"]);

type JsonObjectSchema = {
  type?: string;
  properties?: Record<string, { type?: string; items?: { type?: string } }>;
  required?: string[];
};

function isEmptyString(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && !v.trim());
}

function isPathArrayField(
  key: string,
  prop?: { type?: string; items?: { type?: string } },
): boolean {
  return (
    INPUT_PATH_ARRAY_KEYS.has(key) ||
    (prop?.type === "array" && prop.items?.type === "string" && /paths?/i.test(key))
  );
}

function isPathStringField(key: string, prop?: { type?: string }): boolean {
  return (
    INPUT_PATH_KEYS.has(key) ||
    (prop?.type === "string" && /path|src/i.test(key) && !/output/i.test(key))
  );
}

async function needsResolve(value: unknown, multiple: boolean): Promise<boolean> {
  if (multiple) {
    if (!Array.isArray(value) || value.length === 0) return true;
    for (const p of value) {
      if (typeof p !== "string" || isEmptyString(p)) return true;
      if (!(await pathExists(p))) return true;
    }
    return false;
  }
  if (isEmptyString(value) || typeof value !== "string") return true;
  return !(await pathExists(value));
}

export async function resolveToolArgs(
  schema: ToolSchema,
  args: Record<string, unknown>,
  onActivity?: OnAgentActivity,
): Promise<Record<string, unknown>> {
  const params = schema.parameters as JsonObjectSchema;
  const properties = params.properties ?? {};
  const required = new Set(params.required ?? []);
  const keys = new Set([...Object.keys(properties), ...required]);
  const out = { ...args };

  for (const key of keys) {
    const prop = properties[key];
    if (isPathArrayField(key, prop)) {
      if (!(required.has(key) || key in out)) continue;
      if (await needsResolve(out[key], true)) {
        const fileActId = createActivityId();
        onActivity?.({
          id: fileActId,
          kind: "file",
          status: "running",
          title: "正在选择/读取文件…",
        });
        const picked = await pickAgentFiles();
        if (!picked.length) throw new Error("用户未选择文件");
        const detail = picked.join("\n");
        pushAgentLog({
          level: "step",
          title: `已选择文件（${key}）`,
          detail,
        });
        onActivity?.({
          id: fileActId,
          kind: "file",
          status: "success",
          title: `已读取 ${picked.length} 个文件`,
          detail,
        });
        out[key] = picked;
      }
      continue;
    }
    if (isPathStringField(key, prop)) {
      if (!(required.has(key) || key in out)) continue;
      if (await needsResolve(out[key], false)) {
        const fileActId = createActivityId();
        onActivity?.({
          id: fileActId,
          kind: "file",
          status: "running",
          title: "正在选择/读取文件…",
        });
        const picked = await pickAgentFile();
        if (!picked) throw new Error("用户未选择文件");
        pushAgentLog({
          level: "step",
          title: `已选择文件（${key}）`,
          detail: picked,
        });
        onActivity?.({
          id: fileActId,
          kind: "file",
          status: "success",
          title: `已读取：${basename(picked)}`,
          detail: picked,
        });
        out[key] = picked;
      }
    }
  }

  return out;
}
