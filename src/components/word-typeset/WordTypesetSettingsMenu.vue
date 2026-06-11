<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";

defineProps<{
  canRename?: boolean;
  canDelete?: boolean;
}>();

const emit = defineEmits<{
  importConfig: [];
  exportAllPresets: [];
  exportCurrentPreset: [];
  duplicatePreset: [];
  resetDefault: [];
  editPreset: [];
  deletePreset: [];
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

onClickOutside(rootRef, () => {
  open.value = false;
});

function run(action: () => void) {
  open.value = false;
  action();
}
</script>

<template>
  <div ref="rootRef" class="settings-menu relative">
    <button
      type="button"
      class="settings-trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="方案设置"
      @click="open = !open"
    >
      <span class="i-lucide-settings w-4 h-4" aria-hidden="true" />
    </button>

    <div v-if="open" class="settings-panel" role="menu">
      <p class="settings-panel__title">方案设置</p>
      <button
        type="button"
        role="menuitem"
        class="settings-item"
        @click="run(() => emit('importConfig'))"
      >
        <span class="i-lucide-folder-open w-4 h-4" aria-hidden="true" />
        导入配置 JSON
      </button>
      <button
        type="button"
        role="menuitem"
        class="settings-item"
        @click="run(() => emit('exportCurrentPreset'))"
      >
        <span class="i-lucide-file-down w-4 h-4" aria-hidden="true" />
        导出当前方案
      </button>
      <button
        type="button"
        role="menuitem"
        class="settings-item"
        @click="run(() => emit('exportAllPresets'))"
      >
        <span class="i-lucide-save w-4 h-4" aria-hidden="true" />
        导出全部方案
      </button>
      <button
        type="button"
        role="menuitem"
        class="settings-item"
        @click="run(() => emit('duplicatePreset'))"
      >
        <span class="i-lucide-copy w-4 h-4" aria-hidden="true" />
        复制当前方案
      </button>
      <button
        type="button"
        role="menuitem"
        class="settings-item"
        @click="run(() => emit('resetDefault'))"
      >
        <span class="i-lucide-rotate-ccw w-4 h-4" aria-hidden="true" />
        恢复方案默认
      </button>

      <template v-if="canRename || canDelete">
        <div class="settings-divider" role="separator" />
        <button
          v-if="canRename"
          type="button"
          role="menuitem"
          class="settings-item"
          @click="run(() => emit('editPreset'))"
        >
          <span class="i-lucide-pencil w-4 h-4" aria-hidden="true" />
          编辑方案
        </button>
        <button
          v-if="canDelete"
          type="button"
          role="menuitem"
          class="settings-item settings-item--danger"
          @click="run(() => emit('deletePreset'))"
        >
          <span class="i-lucide-trash-2 w-4 h-4" aria-hidden="true" />
          删除当前方案
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.settings-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  background: var(--dp-surface);
  color: var(--dp-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--dp-dur-fast) ease,
    color var(--dp-dur-fast) ease,
    border-color var(--dp-dur-fast) ease;
}

.settings-trigger:hover {
  background: var(--dp-surface-muted);
  color: var(--dp-text);
  border-color: var(--dp-border-strong);
}

.settings-trigger:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
}

.settings-panel {
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0;
  z-index: 30;
  min-width: 12.5rem;
  padding: 0.375rem;
  border-radius: var(--dp-radius-lg);
  border: 1px solid var(--dp-border);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-md, 0 12px 32px rgb(15 23 42 / 0.12));
}

.settings-panel__title {
  padding: 0.375rem 0.625rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dp-text-muted);
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0 0.625rem;
  border: none;
  border-radius: var(--dp-radius-md);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--dp-text-secondary);
  text-align: left;
  cursor: pointer;
}

.settings-item:hover {
  background: var(--dp-surface-muted);
  color: var(--dp-text);
}

.settings-item:focus-visible {
  outline: none;
  box-shadow: var(--dp-ring);
}

.settings-item--danger {
  color: var(--dp-danger, #b91c1c);
}

.settings-item--danger:hover {
  background: var(--dp-danger-soft);
}

.settings-divider {
  height: 1px;
  margin: 0.25rem 0.375rem;
  background: var(--dp-border);
}
</style>
