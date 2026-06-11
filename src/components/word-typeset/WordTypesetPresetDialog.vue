<script setup lang="ts">
import { ref, watch } from "vue";
import { PRESET_ICON_OPTIONS } from "../../lib/wordTypesetConfig";
import AppButton from "../ui/AppButton.vue";
import AppInput from "../ui/AppInput.vue";

export interface PresetDialogPayload {
  name: string;
  description: string;
  icon: string;
}

const props = defineProps<{
  open: boolean;
  title: string;
  mode?: "add" | "edit";
  defaultName?: string;
  defaultDescription?: string;
  defaultIcon?: string;
  confirmLabel?: string;
}>();

const emit = defineEmits<{
  confirm: [value: PresetDialogPayload];
  cancel: [];
}>();

const name = ref("");
const description = ref("");
const icon = ref("i-lucide-bookmark");

watch(
  () => props.open,
  (visible) => {
    if (!visible) return;
    name.value = props.defaultName ?? "";
    description.value = props.defaultDescription ?? "";
    icon.value = props.defaultIcon ?? "i-lucide-bookmark";
  },
);

function submit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  emit("confirm", {
    name: trimmed,
    description: description.value.trim(),
    icon: icon.value,
  });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submit();
  }
  if (event.key === "Escape") {
    emit("cancel");
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="preset-dialog-root" @click.self="emit('cancel')">
      <div
        class="preset-dialog-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @keydown="onKeydown"
      >
        <h4 class="preset-dialog-title">{{ title }}</h4>

        <label class="preset-dialog-label">
          方案名称
          <AppInput v-model="name" placeholder="请输入方案名称" autofocus />
        </label>

        <label class="preset-dialog-label">
          方案说明
          <textarea
            v-model="description"
            rows="2"
            class="preset-dialog-textarea"
            placeholder="简要描述适用场景（可选）"
          />
        </label>

        <div class="preset-dialog-label">
          <span>方案图标</span>
          <div class="icon-grid" role="listbox" aria-label="选择图标">
            <button
              v-for="opt in PRESET_ICON_OPTIONS"
              :key="opt.value"
              type="button"
              class="icon-pick"
              :class="icon === opt.value ? 'icon-pick--active' : ''"
              :aria-selected="icon === opt.value"
              :title="opt.label"
              @click="icon = opt.value"
            >
              <span class="w-4 h-4" :class="opt.value" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="preset-dialog-actions">
          <AppButton variant="ghost" size="sm" @click="emit('cancel')">取消</AppButton>
          <AppButton variant="primary" size="sm" :disabled="!name.trim()" @click="submit">
            {{ confirmLabel ?? (mode === "edit" ? "保存" : "添加") }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.preset-dialog-root {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgb(15 23 42 / 0.45);
  backdrop-filter: blur(4px);
}

.preset-dialog-panel {
  width: min(26rem, 100%);
  padding: 1.25rem;
  border-radius: var(--dp-radius-xl);
  border: 1px solid var(--dp-border);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-md, 0 16px 40px rgb(15 23 42 / 0.18));
}

.preset-dialog-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--dp-text);
}

.preset-dialog-label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.preset-dialog-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--dp-text);
  background: var(--dp-surface);
  resize: vertical;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.375rem;
}

.icon-pick {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  background: var(--dp-surface-muted);
  color: var(--dp-text-secondary);
  cursor: pointer;
}

.icon-pick:hover {
  border-color: var(--dp-border-strong);
  color: var(--dp-text);
}

.icon-pick--active {
  border-color: var(--dp-primary);
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
}

.preset-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
</style>
