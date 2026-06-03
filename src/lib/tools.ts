import { invoke } from "@tauri-apps/api/core";
import type { ToolOutput, ToolSchema } from "@docpilot/shared-types";

export type { ToolOutput, ToolSchema } from "@docpilot/shared-types";

export async function listTools(): Promise<ToolSchema[]> {
  return invoke<ToolSchema[]>("list_tools");
}

export async function runTool(id: string, args: Record<string, unknown>): Promise<ToolOutput> {
  return invoke<ToolOutput>("run_tool", { id, input: { args } });
}

export const AGENT_FOLDER_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "bmp"];

export async function listFilesInDir(
  dir: string,
  extensions: string[] = AGENT_FOLDER_EXTENSIONS,
): Promise<string[]> {
  return invoke<string[]>("list_files_in_dir", { dir, extensions });
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    return await invoke<boolean>("path_exists", { path });
  } catch {
    return true;
  }
}
