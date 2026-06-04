import { ref, computed } from "vue";
import { load } from "@tauri-apps/plugin-store";
import { waitForTauri } from "../lib/waitForTauri";
import { isProviderConfiguredByEnv, providerSettingsFromEnv } from "../lib/providerEnv";

export interface ProviderSettings {
  baseURL: string;
  apiKey: string;
  model: string;
}

const STORE_PATH = "provider-settings.json";
const KEY = "provider";

/** 未配置 .env / store 时的空壳；示例值见仓库根目录 `.env.example` */
const emptySettings: ProviderSettings = {
  baseURL: "",
  apiKey: "",
  model: "",
};

function mergeSettings(saved?: Partial<ProviderSettings> | null): ProviderSettings {
  const fromEnv = providerSettingsFromEnv();
  return {
    ...emptySettings,
    ...saved,
    ...fromEnv,
  };
}

export function useProviderSettings() {
  const settings = ref<ProviderSettings>(mergeSettings());
  const loaded = ref(false);
  const configuredByEnv = computed(() => isProviderConfiguredByEnv());

  async function loadSettings() {
    try {
      if (!(await waitForTauri())) {
        settings.value = mergeSettings();
        return;
      }
      const store = await load(STORE_PATH, { autoSave: true });
      const saved = await store.get<ProviderSettings>(KEY);
      settings.value = mergeSettings(saved);
    } catch (e) {
      console.error("加载 Provider 设置失败:", e);
      settings.value = mergeSettings();
    } finally {
      loaded.value = true;
    }
  }

  async function saveSettings(next?: ProviderSettings) {
    if (configuredByEnv.value) {
      console.warn("大模型配置由 .env 提供，已忽略保存到本地 store");
      if (next) settings.value = mergeSettings(next);
      return;
    }
    if (next) settings.value = next;
    if (!(await waitForTauri())) return;
    const store = await load(STORE_PATH, { autoSave: true });
    await store.set(KEY, settings.value);
    await store.save();
  }

  return {
    settings,
    loaded,
    configuredByEnv,
    loadSettings,
    saveSettings,
  };
}
