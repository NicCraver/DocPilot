import { invoke } from "@tauri-apps/api/core";

export interface ToolSchema {
  id: string;
  description: string;
  parameters: Record<string, unknown>;
  requires_confirmation: boolean;
}

export interface ToolOutput {
  data: Record<string, unknown>;
  message: string;
}

export async function listTools(): Promise<ToolSchema[]> {
  return invoke<ToolSchema[]>("list_tools");
}

export async function runTool(id: string, args: Record<string, unknown>): Promise<ToolOutput> {
  return invoke<ToolOutput>("run_tool", { id, input: { args } });
}
