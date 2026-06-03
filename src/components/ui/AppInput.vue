<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const model = defineModel<string>({ default: "" });
</script>

<template>
  <input
    v-model="model"
    v-bind="$attrs"
    class="w-full h-11 px-3.5 text-sm rounded-xl bg-[var(--dp-surface)] text-[var(--dp-text)] border border-[var(--dp-border-strong)] placeholder:text-[var(--dp-text-muted)] transition-[border-color,box-shadow] duration-[var(--dp-dur-fast)] hover:border-[var(--dp-text-muted)] focus:border-[var(--dp-primary)] focus:outline-none focus:shadow-[var(--dp-ring)] disabled:opacity-60 disabled:cursor-not-allowed"
  />
</template>
