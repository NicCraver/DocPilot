<script setup lang="ts">
import AppButton from "../../ui/AppButton.vue";
import AppCard from "../../ui/AppCard.vue";

defineProps<{
  title?: string;
  hint?: string;
  path: string | null;
  loading?: boolean;
  error?: string | null;
  message?: string | null;
  actionLabel?: string;
  canRun?: boolean;
}>();

defineEmits<{
  pick: [];
  run: [];
}>();
</script>

<template>
  <AppCard padding="md" class="max-w-2xl">
    <div class="space-y-6">
      <button
        type="button"
        class="w-full border-2 border-dashed rounded-[var(--dp-radius-xl)] p-8 flex flex-col items-center justify-center transition-colors duration-200 cursor-pointer min-h-[10rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-primary)]"
        :class="
          path
            ? 'border-blue-200 bg-[var(--dp-primary-soft)]/40'
            : 'border-[var(--dp-border-strong)] hover:border-[var(--dp-primary)] hover:bg-[var(--dp-surface-muted)]'
        "
        :aria-label="path ? '已选择文件，点击重新选择' : (title ?? '选择文件')"
        @click="$emit('pick')"
      >
        <template v-if="!path">
          <div
            class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-[var(--dp-text)]">{{ title ?? "选择文件" }}</p>
          <p v-if="hint" class="text-xs text-[var(--dp-text-muted)] mt-1 text-center max-w-xs">
            {{ hint }}
          </p>
        </template>
        <template v-else>
          <p
            class="text-sm font-semibold text-[var(--dp-text)] text-center max-w-md truncate"
            :title="path"
          >
            {{ path.split("/").pop() || path }}
          </p>
          <p
            class="text-xs text-[var(--dp-text-muted)] mt-1 max-w-md truncate text-center"
            :title="path"
          >
            {{ path }}
          </p>
          <span class="mt-3 text-xs text-[var(--dp-primary)] font-medium">点击重新选择</span>
        </template>
      </button>

      <slot />

      <div v-if="path || canRun" class="flex justify-end pt-1">
        <AppButton
          variant="primary"
          :loading="loading"
          :disabled="canRun === false"
          @click="$emit('run')"
        >
          {{ loading ? "处理中..." : (actionLabel ?? "开始处理") }}
        </AppButton>
      </div>

      <div
        v-if="error"
        role="alert"
        class="p-4 bg-[var(--dp-danger-soft)] border border-red-200 rounded-xl text-sm text-red-800"
      >
        {{ error }}
      </div>

      <div
        v-if="message"
        role="status"
        class="p-4 bg-[var(--dp-success-soft)] border border-emerald-200 rounded-xl text-sm text-emerald-900"
      >
        {{ message }}
      </div>

      <slot name="result" />
    </div>
  </AppCard>
</template>
