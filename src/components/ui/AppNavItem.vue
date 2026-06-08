<script setup lang="ts">
defineProps<{
  active?: boolean;
  label: string;
}>();
</script>

<template>
  <button
    type="button"
    class="app-nav-item group w-full flex items-center gap-2.5 px-2.5 h-9 rounded-[var(--dp-radius-md)] text-[var(--dp-text-sm)] font-medium text-left cursor-pointer transition-[background-color,color,box-shadow] duration-[var(--dp-dur-fast)] ease-[var(--dp-ease)]"
    :class="
      active
        ? 'bg-[var(--dp-bg)] text-[var(--dp-text)] font-semibold shadow-[inset_0_0_0_1px_var(--dp-border-strong)]'
        : 'text-[var(--dp-text-secondary)] hover:bg-[var(--dp-surface-muted)] hover:text-[var(--dp-text)]'
    "
    :aria-current="active ? 'page' : undefined"
  >
    <span
      class="shrink-0 transition-colors duration-[var(--dp-dur-fast)]"
      :class="
        active
          ? 'text-[var(--dp-text)]'
          : 'text-[var(--dp-text-muted)] group-hover:text-[var(--dp-text-secondary)]'
      "
    >
      <slot name="icon" />
    </span>
    <span class="truncate">{{ label }}</span>
  </button>
</template>
