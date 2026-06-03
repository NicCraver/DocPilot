<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    type?: "button" | "submit" | "reset";
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    variant: "primary",
    size: "md",
    type: "button",
    loading: false,
    disabled: false,
  },
);

const isDisabled = computed(() => props.disabled || props.loading);

const sizeClass = computed(
  () =>
    ({
      sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
      md: "h-11 px-5 text-sm gap-2 rounded-xl",
      lg: "h-12 px-6 text-base gap-2 rounded-xl",
    })[props.size],
);

const variantClass = computed(
  () =>
    ({
      primary:
        "bg-[var(--dp-primary)] text-white hover:bg-[var(--dp-primary-hover)] active:scale-[0.98] shadow-[var(--dp-shadow-sm)]",
      secondary:
        "bg-[var(--dp-surface)] text-[var(--dp-text)] border border-[var(--dp-border-strong)] hover:bg-[var(--dp-surface-muted)] hover:border-[var(--dp-text-muted)] active:scale-[0.98]",
      ghost:
        "bg-transparent text-[var(--dp-text-secondary)] hover:bg-[var(--dp-surface-muted)] hover:text-[var(--dp-text)] active:scale-[0.98]",
      danger:
        "bg-[var(--dp-danger)] text-white hover:brightness-95 active:scale-[0.98] shadow-[var(--dp-shadow-sm)]",
    })[props.variant],
);
</script>

<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading"
    class="inline-flex items-center justify-center font-semibold whitespace-nowrap cursor-pointer select-none transition-[background-color,transform,border-color,filter] duration-[var(--dp-dur-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    :class="[sizeClass, variantClass]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-0.5 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>
