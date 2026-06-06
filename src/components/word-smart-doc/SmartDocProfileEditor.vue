<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { SmartDocProfile, SmartDocSection, SmartDocStyle } from "../../lib/smartDocTypes";
import AppButton from "../ui/AppButton.vue";

const props = withDefaults(
  defineProps<{
    profile: SmartDocProfile | null;
    templateName?: string;
    saving?: boolean;
  }>(),
  {
    templateName: "",
    saving: false,
  },
);

const emit = defineEmits<{
  save: [profile: SmartDocProfile];
}>();

const COMMON_STYLE_KEYS = ["title", "heading1", "heading2", "heading3", "body"];
const NUMERIC_STYLE_KEYS = [
  "size_pt",
  "line_spacing",
  "first_line_indent_chars",
  "outline_level",
] as const;
const ALIGN_OPTIONS = [
  { value: "", label: "继承" },
  { value: "left", label: "左对齐" },
  { value: "center", label: "居中" },
  { value: "right", label: "右对齐" },
  { value: "justify", label: "两端" },
];

const draft = ref<SmartDocProfile | null>(null);
const dirty = ref(false);

const styleRows = computed(() => {
  if (!draft.value) return [];
  const keys = new Set<string>();
  keys.add("body");
  if (draft.value.styles.title) keys.add("title");
  for (const section of draft.value.structure) {
    keys.add(`heading${section.level}`);
  }
  for (const key of COMMON_STYLE_KEYS) {
    if (draft.value.styles[key]) keys.add(key);
  }
  for (const key of Object.keys(draft.value.styles)) keys.add(key);
  return [...keys].map((key) => ({
    key,
    label: styleLabel(key),
    style: ensureStyle(key),
  }));
});

watch(
  () => props.profile,
  (profile) => {
    draft.value = profile ? cloneProfile(profile) : null;
    dirty.value = false;
  },
  { immediate: true },
);

function cloneProfile(profile: SmartDocProfile): SmartDocProfile {
  return JSON.parse(JSON.stringify(profile)) as SmartDocProfile;
}

function styleLabel(key: string) {
  if (key === "title") return "文档标题";
  if (key === "body") return "正文";
  const match = key.match(/^heading(\d+)$/);
  if (match) return `${match[1]} 级标题`;
  return key;
}

function ensureStyle(key: string): SmartDocStyle {
  if (!draft.value) return {};
  draft.value.styles[key] ??= {};
  return draft.value.styles[key];
}

function markDirty() {
  dirty.value = true;
}

function sectionKey() {
  const keys = new Set(draft.value?.structure.map((s) => s.key) ?? []);
  let next = 1;
  while (keys.has(`ui_${next}`)) next += 1;
  return `ui_${next}`;
}

function addSection() {
  if (!draft.value) return;
  const previous = draft.value.structure.at(-1);
  draft.value.structure.push({
    key: sectionKey(),
    title: "新章节",
    level: previous?.level ?? 1,
  });
  ensureStyle(`heading${previous?.level ?? 1}`);
  markDirty();
}

function removeSection(index: number) {
  if (!draft.value) return;
  draft.value.structure.splice(index, 1);
  markDirty();
}

function moveSection(index: number, delta: -1 | 1) {
  if (!draft.value) return;
  const target = index + delta;
  if (target < 0 || target >= draft.value.structure.length) return;
  const [section] = draft.value.structure.splice(index, 1);
  draft.value.structure.splice(target, 0, section);
  markDirty();
}

function onSectionLevelChange(section: SmartDocSection) {
  section.level = Math.min(6, Math.max(1, Number(section.level) || 1));
  ensureStyle(`heading${section.level}`);
  markDirty();
}

function normalizeStyle(style: SmartDocStyle) {
  for (const key of Object.keys(style) as Array<keyof SmartDocStyle>) {
    if (style[key] === "" || style[key] == null) delete style[key];
  }
  for (const key of NUMERIC_STYLE_KEYS) {
    const value = style[key];
    if (value === undefined) continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) style[key] = numberValue;
    else delete style[key];
  }
}

function normalizeProfile(profile: SmartDocProfile): SmartDocProfile {
  const next = cloneProfile(profile);
  for (const style of Object.values(next.styles)) normalizeStyle(style);
  next.structure = next.structure.map((section, index) => ({
    ...section,
    key: section.key.trim() || `ui_${index + 1}`,
    title: section.title.trim() || "未命名章节",
    level: Math.min(6, Math.max(1, Number(section.level) || 1)),
  }));
  return next;
}

function resetDraft() {
  draft.value = props.profile ? cloneProfile(props.profile) : null;
  dirty.value = false;
}

function saveDraft() {
  if (!draft.value) return;
  emit("save", normalizeProfile(draft.value));
  dirty.value = false;
}
</script>

<template>
  <section
    v-if="draft"
    class="rounded-xl border border-[var(--dp-border)] bg-[var(--dp-surface)] p-4 space-y-5"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold text-[var(--dp-text-muted)]">模板 profile</p>
        <h3 class="font-semibold truncate">{{ templateName || "当前模板" }}</h3>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="dirty"
          class="text-xs font-medium text-[var(--dp-primary)] bg-[var(--dp-primary-soft)] rounded-full px-2 py-1"
        >
          未保存
        </span>
        <AppButton size="sm" variant="ghost" :disabled="saving || !dirty" @click="resetDraft">
          <span class="i-lucide-rotate-ccw w-4 h-4" aria-hidden="true" />
          还原
        </AppButton>
        <AppButton size="sm" :loading="saving" :disabled="!dirty" @click="saveDraft">
          <span class="i-lucide-save w-4 h-4" aria-hidden="true" />
          保存
        </AppButton>
      </div>
    </div>

    <div class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
      <div class="space-y-3 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-sm font-semibold">章节结构</h4>
          <button type="button" class="profile-icon-btn" title="新增章节" @click="addSection">
            <span class="i-lucide-plus w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="(section, index) in draft.structure"
            :key="section.key"
            class="grid grid-cols-[2.75rem_minmax(0,1fr)_4.5rem_6.5rem] gap-2 items-center"
          >
            <span
              class="text-xs tabular-nums text-center text-[var(--dp-text-muted)] bg-[var(--dp-surface-muted)] rounded-lg py-2"
            >
              {{ index + 1 }}
            </span>
            <input
              v-model="section.title"
              class="profile-input min-w-0"
              placeholder="章节标题"
              @input="markDirty"
            />
            <select
              v-model.number="section.level"
              class="profile-input"
              @change="onSectionLevelChange(section)"
            >
              <option v-for="level in [1, 2, 3, 4, 5, 6]" :key="level" :value="level">
                L{{ level }}
              </option>
            </select>
            <div class="flex items-center justify-end gap-1">
              <button
                type="button"
                class="profile-icon-btn"
                title="上移"
                :disabled="index === 0"
                @click="moveSection(index, -1)"
              >
                <span class="i-lucide-arrow-up w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="profile-icon-btn"
                title="下移"
                :disabled="index === draft.structure.length - 1"
                @click="moveSection(index, 1)"
              >
                <span class="i-lucide-arrow-down w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="profile-icon-btn"
                title="删除"
                @click="removeSection(index)"
              >
                <span class="i-lucide-trash-2 w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3 min-w-0">
        <h4 class="text-sm font-semibold">样式配置</h4>
        <div class="space-y-3">
          <div
            v-for="row in styleRows"
            :key="row.key"
            class="grid grid-cols-2 lg:grid-cols-4 gap-2 border border-[var(--dp-border)] rounded-lg p-3"
          >
            <div class="col-span-2 lg:col-span-4 flex items-center justify-between gap-2">
              <p class="text-sm font-semibold">{{ row.label }}</p>
              <label class="text-xs flex items-center gap-1 text-[var(--dp-text-secondary)]">
                <input v-model="row.style.bold" type="checkbox" @change="markDirty" />
                加粗
              </label>
            </div>
            <label class="profile-field">
              <span>中文字体</span>
              <input v-model="row.style.font_ea" class="profile-input" @input="markDirty" />
            </label>
            <label class="profile-field">
              <span>西文字体</span>
              <input v-model="row.style.font_ascii" class="profile-input" @input="markDirty" />
            </label>
            <label class="profile-field">
              <span>字号</span>
              <input
                v-model.number="row.style.size_pt"
                class="profile-input"
                type="number"
                min="6"
                max="72"
                step="0.5"
                @input="markDirty"
              />
            </label>
            <label class="profile-field">
              <span>对齐</span>
              <select v-model="row.style.align" class="profile-input" @change="markDirty">
                <option v-for="option in ALIGN_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="profile-field">
              <span>行距</span>
              <input
                v-model.number="row.style.line_spacing"
                class="profile-input"
                type="number"
                min="0.8"
                max="3"
                step="0.1"
                @input="markDirty"
              />
            </label>
            <label class="profile-field">
              <span>首行缩进</span>
              <input
                v-model.number="row.style.first_line_indent_chars"
                class="profile-input"
                type="number"
                min="0"
                max="6"
                step="0.5"
                @input="markDirty"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-input {
  width: 100%;
  height: 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--dp-border);
  background: var(--dp-surface);
  padding: 0 0.625rem;
  font-size: 0.875rem;
  color: var(--dp-text);
  outline: none;
}

.profile-input:focus {
  border-color: var(--dp-primary);
  box-shadow: 0 0 0 3px var(--dp-primary-soft);
}

.profile-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--dp-text-muted);
}

.profile-icon-btn {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dp-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  transition:
    background-color var(--dp-dur-fast),
    border-color var(--dp-dur-fast),
    color var(--dp-dur-fast);
}

.profile-icon-btn:hover:not(:disabled) {
  color: var(--dp-text);
  background: var(--dp-surface-muted);
  border-color: var(--dp-border);
}

.profile-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
