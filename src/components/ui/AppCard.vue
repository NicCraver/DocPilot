<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    padding?: "none" | "sm" | "md" | "lg";
  }>(),
  { padding: "md" },
);

const paddingClass = computed(
  () =>
    ({
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    })[props.padding],
);
</script>

<template>
  <div
    class="bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] shadow-[var(--dp-shadow-sm)] overflow-hidden"
    :class="paddingClass"
  >
    <slot />
  </div>
</template>
