<script setup lang="ts">
import { computed, ref } from "vue";
import { TOOL_CATALOG, TOOL_CATEGORIES, toolsByCategory } from "../../lib/toolCatalog";
import { toolViews } from "./toolViews";
import AppInput from "../ui/AppInput.vue";

const activeId = ref("compress_pdf");
const search = ref("");

const activeMeta = computed(() => TOOL_CATALOG.find((t) => t.id === activeId.value));
const activeComponent = computed(() => toolViews[activeId.value]);
const activeCategoryLabel = computed(() => {
  const cat = activeMeta.value?.category;
  return TOOL_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
});

const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return TOOL_CATEGORIES;
  return TOOL_CATEGORIES.filter((cat) =>
    toolsByCategory(cat.id).some(
      (t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
    ),
  );
});

function toolsInCategory(catId: string) {
  const q = search.value.trim().toLowerCase();
  const list = toolsByCategory(catId);
  if (!q) return list;
  return list.filter((t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
}
</script>

<template>
  <div class="flex gap-5 min-h-[calc(100vh-12rem)]">
    <!-- 工具列表 -->
    <aside
      class="w-60 shrink-0 flex flex-col bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] shadow-[var(--dp-shadow-sm)] overflow-hidden"
      aria-label="工具列表"
    >
      <div class="p-4 border-b border-[var(--dp-border)] space-y-3">
        <div>
          <h2 class="text-sm font-bold text-[var(--dp-text)]">全部工具</h2>
          <p class="text-xs text-[var(--dp-text-muted)] mt-0.5">{{ TOOL_CATALOG.length }} 项可用</p>
        </div>
        <div class="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <AppInput v-model="search" placeholder="搜索工具..." class="pl-9" autocomplete="off" />
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto p-2 space-y-4">
        <template v-if="filteredCategories.length">
          <section v-for="cat in filteredCategories" :key="cat.id">
            <h3
              class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dp-text-muted)]"
            >
              {{ cat.label }}
            </h3>
            <ul class="space-y-0.5">
              <li v-for="tool in toolsInCategory(cat.id)" :key="tool.id">
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-sm transition-colors duration-200 cursor-pointer min-h-10"
                  :class="
                    activeId === tool.id
                      ? 'bg-[var(--dp-primary-soft)] text-[var(--dp-primary)] font-semibold'
                      : 'text-[var(--dp-text-secondary)] hover:bg-slate-50 hover:text-[var(--dp-text)]'
                  "
                  :aria-current="activeId === tool.id ? 'true' : undefined"
                  @click="activeId = tool.id"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.75"
                    stroke="currentColor"
                    class="w-4 h-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" :d="tool.icon" />
                  </svg>
                  <span class="truncate">{{ tool.label }}</span>
                </button>
              </li>
            </ul>
          </section>
        </template>
        <p v-else class="px-3 py-6 text-sm text-[var(--dp-text-muted)] text-center">
          未找到匹配的工具
        </p>
      </nav>
    </aside>

    <!-- 工具面板 -->
    <section class="flex-1 min-w-0 flex flex-col">
      <header
        v-if="activeMeta"
        class="mb-5 pb-4 border-b border-[var(--dp-border)] flex items-start justify-between gap-4"
      >
        <div>
          <h2 class="text-xl font-bold text-[var(--dp-text)]">{{ activeMeta.label }}</h2>
          <p class="text-sm text-[var(--dp-text-secondary)] mt-1 leading-relaxed">
            {{ activeMeta.desc }}
          </p>
        </div>
        <span
          class="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
        >
          {{ activeCategoryLabel }}
        </span>
      </header>

      <div class="flex-1 overflow-y-auto pb-4">
        <component :is="activeComponent" v-if="activeComponent" />
        <p v-else class="text-sm text-[var(--dp-text-muted)]">未找到该工具的界面。</p>
      </div>
    </section>
  </div>
</template>
