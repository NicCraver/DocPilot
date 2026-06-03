import { open } from "@tauri-apps/plugin-dialog";
import { PDF_FILTERS, IMAGE_FILTERS } from "../composables/useToolRunner";

const AGENT_FILTERS = [...PDF_FILTERS, ...IMAGE_FILTERS];

export async function pickAgentFile(): Promise<string | null> {
  const selected = await open({ multiple: false, filters: AGENT_FILTERS });
  return typeof selected === "string" ? selected : null;
}

export async function pickAgentFiles(): Promise<string[]> {
  const selected = await open({ multiple: true, filters: AGENT_FILTERS });
  return Array.isArray(selected) ? selected : selected ? [selected] : [];
}

export async function pickAgentDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}
