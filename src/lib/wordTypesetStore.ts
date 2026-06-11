import { load } from "@tauri-apps/plugin-store";
import { waitForTauri } from "./waitForTauri";
import {
  builtinPresetProfiles,
  BUILTIN_PRESET_IDS,
  governmentWordTypesetConfig,
  isBuiltinPresetId,
  journalWordTypesetConfig,
  mergeWordTypesetConfig,
  thesisWordTypesetConfig,
  type BuiltinPresetId,
  type TypesetOutputMode,
  type WordTypesetConfig,
  type WordTypesetPresetProfile,
} from "./wordTypesetConfig";

const STORE_PATH = "word-typeset-config.json";
const KEY = "cache";

export interface WordTypesetUiPrefs {
  onboardingDismissed?: boolean;
  outputMode?: TypesetOutputMode;
  outputDir?: string | null;
  outputSuffix?: string;
  continueOnError?: boolean;
}

export interface WordTypesetCache {
  version: 2;
  activePresetId: string;
  profiles: WordTypesetPresetProfile[];
  presets: Record<string, WordTypesetConfig>;
  ui?: WordTypesetUiPrefs;
}

/** @deprecated 旧版缓存结构，仅用于迁移 */
interface LegacyWordTypesetCache {
  activePresetId?: string;
  presets?: Partial<Record<BuiltinPresetId, WordTypesetConfig>>;
}

function defaultBuiltinPresets(): Record<BuiltinPresetId, WordTypesetConfig> {
  return {
    government: governmentWordTypesetConfig(),
    thesis: thesisWordTypesetConfig(),
    journal: journalWordTypesetConfig(),
  };
}

function defaultCache(): WordTypesetCache {
  return {
    version: 2,
    activePresetId: "government",
    profiles: builtinPresetProfiles(),
    presets: { ...defaultBuiltinPresets() },
    ui: {
      outputMode: "in_place",
      outputSuffix: "_排版",
      continueOnError: true,
      onboardingDismissed: false,
    },
  };
}

function mergeProfiles(
  base: WordTypesetPresetProfile[],
  incoming?: WordTypesetPresetProfile[],
): WordTypesetPresetProfile[] {
  const map = new Map(base.map((profile) => [profile.id, profile]));
  for (const profile of incoming ?? []) {
    if (!profile?.id) continue;
    const existing = map.get(profile.id);
    map.set(profile.id, {
      id: profile.id,
      label: profile.label || existing?.label || "未命名方案",
      description: profile.description ?? existing?.description ?? "",
      kind: profile.kind ?? (isBuiltinPresetId(profile.id) ? "builtin" : "custom"),
      icon: profile.icon ?? existing?.icon,
    });
  }
  const builtins = builtinPresetProfiles();
  for (const builtin of builtins) {
    if (!map.has(builtin.id)) map.set(builtin.id, builtin);
  }
  const custom = [...map.values()].filter((p) => p.kind === "custom");
  return [...builtins, ...custom];
}

function mergePresetConfigs(
  base: Record<string, WordTypesetConfig>,
  incoming?: Record<string, WordTypesetConfig | undefined> | null,
): Record<string, WordTypesetConfig> {
  const next = { ...base };
  for (const [id, config] of Object.entries(incoming ?? {})) {
    if (!config) continue;
    const fallback = isBuiltinPresetId(id)
      ? defaultBuiltinPresets()[id]
      : governmentWordTypesetConfig();
    next[id] = mergeWordTypesetConfig(fallback, config);
  }
  for (const id of BUILTIN_PRESET_IDS) {
    if (!next[id]) next[id] = defaultBuiltinPresets()[id];
  }
  return next;
}

function migrateLegacyCache(raw: LegacyWordTypesetCache): WordTypesetCache {
  const base = defaultCache();
  const active =
    raw.activePresetId && (isBuiltinPresetId(raw.activePresetId) || raw.activePresetId)
      ? raw.activePresetId
      : base.activePresetId;
  return {
    version: 2,
    activePresetId: active,
    profiles: base.profiles,
    presets: mergePresetConfigs(base.presets, raw.presets),
  };
}

export function normalizeWordTypesetCache(
  raw?: Partial<WordTypesetCache> | LegacyWordTypesetCache | null,
): WordTypesetCache {
  if (!raw) return defaultCache();
  if (raw.version !== 2) return migrateLegacyCache(raw as LegacyWordTypesetCache);

  const base = defaultCache();
  const profiles = mergeProfiles(base.profiles, raw.profiles);
  const presets = mergePresetConfigs(base.presets, raw.presets);
  const activeCandidate = raw.activePresetId ?? base.activePresetId;
  const activePresetId = profiles.some((p) => p.id === activeCandidate)
    ? activeCandidate
    : base.activePresetId;

  return {
    version: 2,
    activePresetId,
    profiles,
    presets,
    ui: raw.ui ?? {},
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

/** Agent 工具与排版页共用：读取当前激活方案配置 */
export async function loadActiveTypesetConfig(): Promise<{
  activePresetId: string;
  config: WordTypesetConfig;
}> {
  const cache = await loadWordTypesetCache();
  const config = structuredClone(
    cache.presets[cache.activePresetId] ?? governmentWordTypesetConfig(),
  );
  return { activePresetId: cache.activePresetId, config };
}

export async function loadWordTypesetCache(): Promise<WordTypesetCache> {
  try {
    const store = await getStore();
    if (!store) return defaultCache();
    const saved = await store.get<Partial<WordTypesetCache> | LegacyWordTypesetCache>(KEY);
    return normalizeWordTypesetCache(saved);
  } catch (e) {
    console.error("加载 Word 排版配置缓存失败:", e);
    return defaultCache();
  }
}

export async function saveWordTypesetCache(cache: WordTypesetCache): Promise<void> {
  const normalized = normalizeWordTypesetCache(cache);
  const store = await getStore();
  if (!store) return;
  await store.set(KEY, normalized);
  await store.save();
}

export async function updateWordTypesetCache(
  patch: Partial<WordTypesetCache> & {
    presetId?: string;
    presetConfig?: WordTypesetConfig;
    removePresetId?: string;
    addProfile?: WordTypesetPresetProfile;
  },
): Promise<WordTypesetCache> {
  const current = await loadWordTypesetCache();
  const next: WordTypesetCache = {
    version: 2,
    activePresetId: patch.activePresetId ?? current.activePresetId,
    profiles: [...current.profiles],
    presets: { ...current.presets },
  };

  if (patch.addProfile) {
    if (!next.profiles.some((p) => p.id === patch.addProfile!.id)) {
      next.profiles.push(patch.addProfile);
    }
    if (!next.presets[patch.addProfile.id]) {
      next.presets[patch.addProfile.id] = governmentWordTypesetConfig();
    }
  }

  if (patch.presetId && patch.presetConfig) {
    next.presets[patch.presetId] = patch.presetConfig;
  }

  if (patch.presets) {
    next.presets = mergePresetConfigs(next.presets, patch.presets);
  }

  if (patch.profiles) {
    next.profiles = mergeProfiles(builtinPresetProfiles(), patch.profiles);
  }

  if (patch.removePresetId) {
    if (!isBuiltinPresetId(patch.removePresetId)) {
      next.profiles = next.profiles.filter((p) => p.id !== patch.removePresetId);
      delete next.presets[patch.removePresetId];
      if (next.activePresetId === patch.removePresetId) {
        next.activePresetId = "government";
      }
    }
  }

  const normalized = normalizeWordTypesetCache(next);
  await saveWordTypesetCache(normalized);
  return normalized;
}
