import { load } from "@tauri-apps/plugin-store";
import { waitForTauri } from "./waitForTauri";

const STORE_PATH = "word-smart-doc-config.json";
const KEY = "currentTemplateId";

let storePromise: ReturnType<typeof load> | null = null;

async function getStore() {
  if (!(await waitForTauri())) return null;
  if (!storePromise) {
    storePromise = load(STORE_PATH, { autoSave: true });
  }
  return storePromise;
}

export async function loadCurrentTemplateId(): Promise<string | null> {
  try {
    const store = await getStore();
    if (!store) return null;
    return (await store.get<string>(KEY)) ?? null;
  } catch (e) {
    console.error("加载当前模板 id 失败:", e);
    return null;
  }
}

export async function saveCurrentTemplateId(id: string | null): Promise<void> {
  const store = await getStore();
  if (!store) return;
  await store.set(KEY, id);
  await store.save();
}
