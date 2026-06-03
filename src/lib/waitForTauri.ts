import { isTauri } from "@tauri-apps/api/core";

/** 等待 Tauri IPC 注入完成（避免首屏 onMounted 时 invoke 未定义） */
export async function waitForTauri(maxMs = 5000): Promise<boolean> {
  if (!isTauri()) return false;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const internals = (globalThis as unknown as { __TAURI_INTERNALS__?: { invoke?: unknown } })
      .__TAURI_INTERNALS__;
    if (internals?.invoke) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}
