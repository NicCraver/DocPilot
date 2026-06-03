<script setup lang="ts">
defineProps<{
  variant?: "success" | "info" | "warning" | "danger" | "neutral";
  pulse?: boolean;
}>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
    :class="{
      'bg-[var(--dp-success-soft)] border-emerald-200 text-emerald-800': variant === 'success',
      'bg-[var(--dp-primary-soft)] border-blue-200 text-blue-800': variant === 'info',
      'bg-[var(--dp-accent-soft)] border-orange-200 text-orange-800': variant === 'warning',
      'bg-[var(--dp-danger-soft)] border-red-200 text-red-800': variant === 'danger',
      'bg-slate-100 border-slate-200 text-slate-700': !variant || variant === 'neutral',
    }"
  >
    <span
      v-if="pulse"
      class="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
