<script setup lang="ts">
defineProps<{
  active?: boolean;
  label: string;
}>();
</script>

<template>
  <button
    type="button"
    class="group w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium text-left cursor-pointer transition-[background-color,color] duration-[var(--dp-dur-fast)]"
    :class="
      active
        ? 'bg-[var(--dp-primary-soft)] text-[var(--dp-primary)] font-semibold'
        : 'text-[var(--dp-text-secondary)] hover:bg-[var(--dp-surface-muted)] hover:text-[var(--dp-text)]'
    "
    :aria-current="active ? 'page' : undefined"
  >
    <span
      class="shrink-0 transition-colors duration-[var(--dp-dur-fast)]"
      :class="
        active
          ? 'text-[var(--dp-primary)]'
          : 'text-[var(--dp-text-muted)] group-hover:text-[var(--dp-text-secondary)]'
      "
    >
      <slot name="icon" />
    </span>
    <span class="truncate">{{ label }}</span>
  </button>
</template>
