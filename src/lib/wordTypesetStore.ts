import { load } from "@tauri-apps/plugin-store";
import { waitForTauri } from "./waitForTauri";
import {
  governmentWordTypesetConfig,
  journalWordTypesetConfig,
  mergeWordTypesetConfig,
  thesisWordTypesetConfig,
  type WordTypesetConfig,
  type WordTypesetPresetId,
} from "./wordTypesetConfig";

const STORE_PATH = "word-typeset-config.json";
const KEY = "cache";
const PRESET_IDS: WordTypesetPresetId[] = ["government", "thesis", "journal"];

export interface WordTypesetCache {
  activePresetId: WordTypesetPresetId;
  presets: Record<WordTypesetPresetId, WordTypesetConfig>;
}

function defaultCache(): WordTypesetCache {
  return {
    activePresetId: "government",
    presets: {
      government: governmentWordTypesetConfig(),
      thesis: thesisWordTypesetConfig(),
      journal: journalWordTypesetConfig(),
    },
  };
}

function normalizeCache(raw?: Partial<WordTypesetCache> | null): WordTypesetCache {
  const base = defaultCache();
  if (!raw) return base;
  const active = PRESET_IDS.includes(raw.activePresetId as WordTypesetPresetId)
    ? (raw.activePresetId as WordTypesetPresetId)
    : base.activePresetId;
  return {
    activePresetId: active,
    presets: {
      government: mergeWordTypesetConfig(base.presets.government, raw.presets?.government),
      thesis: mergeWordTypesetConfig(base.presets.thesis, raw.presets?.thesis),
      journal: mergeWordTypesetConfig(base.presets.journal, raw.presets?.journal),
    },
  };
}

let storePromise: ReturnType<typeof load> | null = null;

async function getStore() {
  if (!(await waitForTauri())) return null;
  if (!storePromise) {
    storePromise = load(STORE_PATH, { autoSave: true });
  }
  return storePromise;
}

export async function loadWordTypesetCache(): Promise<WordTypesetCache> {
  try {
    const store = await getStore();
    if (!store) return defaultCache();
    const saved = await store.get<Partial<WordTypesetCache>>(KEY);
    return normalizeCache(saved);
  } catch (e) {
    console.error("加载 Word 排版配置缓存失败:", e);
    return defaultCache();
  }
}

export async function saveWordTypesetCache(cache: WordTypesetCache): Promise<void> {
  const normalized = normalizeCache(cache);
  const store = await getStore();
  if (!store) return;
  await store.set(KEY, normalized);
  await store.save();
}

export async function updateWordTypesetCache(
  patch: Partial<WordTypesetCache> & {
    presetId?: WordTypesetPresetId;
    presetConfig?: WordTypesetConfig;
  },
): Promise<WordTypesetCache> {
  const current = await loadWordTypesetCache();
  const next: WordTypesetCache = {
    activePresetId: patch.activePresetId ?? current.activePresetId,
    presets: { ...current.presets },
  };
  if (patch.presetId && patch.presetConfig) {
    next.presets[patch.presetId] = patch.presetConfig;
  }
  if (patch.presets) {
    for (const id of PRESET_IDS) {
      if (patch.presets[id]) {
        next.presets[id] = mergeWordTypesetConfig(next.presets[id], patch.presets[id]);
      }
    }
  }
  await saveWordTypesetCache(next);
  return normalizeCache(next);
}
