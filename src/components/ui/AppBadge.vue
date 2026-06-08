<script setup lang="ts">
defineProps<{
  variant?: "success" | "info" | "warning" | "danger" | "neutral";
  pulse?: boolean;
}>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--dp-radius-sm)] text-[0.6875rem] font-medium border transition-colors duration-[var(--dp-dur-fast)]"
    :class="{
      'bg-[var(--dp-success-soft)] border-[color-mix(in_srgb,var(--dp-success)_18%,transparent)] text-[var(--dp-success)]':
        variant === 'success',
      'bg-[var(--dp-primary-soft)] border-[color-mix(in_srgb,var(--dp-primary)_18%,transparent)] text-[var(--dp-primary)]':
        variant === 'info',
      'bg-[var(--dp-accent-soft)] border-[color-mix(in_srgb,var(--dp-accent)_18%,transparent)] text-[var(--dp-accent)]':
        variant === 'warning',
      'bg-[var(--dp-danger-soft)] border-[color-mix(in_srgb,var(--dp-danger)_18%,transparent)] text-[var(--dp-danger)]':
        variant === 'danger',
      'bg-[var(--dp-surface-muted)] border-[var(--dp-border)] text-[var(--dp-text-secondary)]':
        !variant || variant === 'neutral',
    }"
  >
    <span v-if="pulse" class="w-1.5 h-1.5 rounded-full bg-current opacity-90" aria-hidden="true" />
    <slot />
  </span>
</template>
