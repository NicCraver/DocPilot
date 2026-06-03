import { ref } from "vue";
import { load } from "@tauri-apps/plugin-store";

export interface ProviderSettings {
  baseURL: string;
  apiKey: string;
  model: string;
}

const STORE_PATH = "provider-settings.json";
const KEY = "provider";

const defaults: ProviderSettings = {
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
  model: "llama3.2",
};

export function useProviderSettings() {
  const settings = ref<ProviderSettings>({ ...defaults });
  const loaded = ref(false);

  async function loadSettings() {
    const store = await load(STORE_PATH, { autoSave: true });
    const saved = await store.get<ProviderSettings>(KEY);
    if (saved) {
      settings.value = { ...defaults, ...saved };
    }
    loaded.value = true;
  }

  async function saveSettings(next?: ProviderSettings) {
    if (next) settings.value = next;
    const store = await load(STORE_PATH, { autoSave: true });
    await store.set(KEY, settings.value);
    await store.save();
  }

  return { settings, loaded, loadSettings, saveSettings, defaults };
}
