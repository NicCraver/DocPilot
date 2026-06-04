<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  TOOL_CATALOG,
  TOOL_CATEGORIES,
  toolsByCategory,
  type ToolCategory,
} from "../../lib/toolCatalog";
import { toolViews } from "./toolViews";
import AppInput from "../ui/AppInput.vue";
import AppBadge from "../ui/AppBadge.vue";

const activeId = ref("compress_pdf");
const search = ref("");
const categoryFilter = ref<ToolCategory | null>(null);

const activeMeta = computed(() => TOOL_CATALOG.find((t) => t.id === activeId.value));
const activeComponent = computed(() => toolViews[activeId.value]);
const activeCategoryLabel = computed(() => {
  const cat = activeMeta.value?.category;
  return TOOL_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
});

const categoryCounts = computed(
  () =>
    Object.fromEntries(TOOL_CATEGORIES.map((c) => [c.id, toolsByCategory(c.id).length])) as Record<
      ToolCategory,
      number
    >,
);

const hasSearch = computed(() => search.value.trim().length > 0);

const visibleCategories = computed(() => {
  const q = search.value.trim().toLowerCase();
  let cats = TOOL_CATEGORIES;
  if (categoryFilter.value) {
    cats = cats.filter((c) => c.id === categoryFilter.value);
  }
  if (!q) return cats;
  return cats.filter((cat) => toolsInCategory(cat.id).length > 0);
});

function toolsInCategory(catId: string) {
  const q = search.value.trim().toLowerCase();
  let list = toolsByCategory(catId);
  if (q) {
    list = list.filter(
      (t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
    );
  }
  return list;
}

const totalVisibleTools = computed(() =>
  visibleCategories.value.reduce((n, cat) => n + toolsInCategory(cat.id).length, 0),
);

function selectTool(id: string) {
  activeId.value = id;
}

function clearSearch() {
  search.value = "";
}

function toggleCategory(cat: ToolCategory | null) {
  categoryFilter.value = categoryFilter.value === cat ? null : cat;
}

watch([search, categoryFilter], () => {
  const visible = TOOL_CATALOG.filter((t) => {
    if (categoryFilter.value && t.category !== categoryFilter.value) return false;
    const q = search.value.trim().toLowerCase();
    if (!q) return true;
    return t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
  });
  if (visible.length && !visible.some((t) => t.id === activeId.value)) {
    activeId.value = visible[0].id;
  }
});
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[calc(100vh-12rem)]">
    <a
      href="#tool-workspace"
      class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-[var(--dp-primary)] focus:text-white text-sm font-medium"
    >
      跳到工具操作区
    </a>

    <!-- 工具列表侧栏 -->
    <aside
      class="w-full lg:w-[17rem] shrink-0 flex flex-col bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] shadow-[var(--dp-shadow-sm)] overflow-hidden lg:max-h-[calc(100vh-14rem)]"
      aria-label="工具列表"
    >
      <div class="p-4 border-b border-[var(--dp-border)] space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-[var(--dp-text)]">全部工具</h2>
            <p class="text-xs text-[var(--dp-text-muted)] mt-0.5">
              <template v-if="hasSearch || categoryFilter">
                显示 {{ totalVisibleTools }} / {{ TOOL_CATALOG.length }} 项
              </template>
              <template v-else>{{ TOOL_CATALOG.length }} 项可用</template>
            </p>
          </div>
          <AppBadge v-if="categoryFilter" variant="info">
            {{ TOOL_CATEGORIES.find((c) => c.id === categoryFilter)?.label }}
          </AppBadge>
        </div>

        <!-- 分类筛选 -->
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="按分类筛选">
          <button
            type="button"
            class="h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-[var(--dp-dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-primary)]"
            :class="
              !categoryFilter
                ? 'bg-[var(--dp-primary)] text-white'
                : 'bg-[var(--dp-surface-muted)] text-[var(--dp-text-secondary)] hover:bg-slate-100 hover:text-[var(--dp-text)]'
            "
            :aria-pressed="!categoryFilter"
            @click="categoryFilter = null"
          >
            全部
          </button>
          <button
            v-for="cat in TOOL_CATEGORIES"
            :key="cat.id"
            type="button"
            class="h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-[var(--dp-dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-primary)]"
            :class="
              categoryFilter === cat.id
                ? 'bg-[var(--dp-primary)] text-white'
                : 'bg-[var(--dp-surface-muted)] text-[var(--dp-text-secondary)] hover:bg-slate-100 hover:text-[var(--dp-text)]'
            "
            :aria-pressed="categoryFilter === cat.id"
            @click="toggleCategory(cat.id)"
          >
            {{ cat.label }}
            <span
              class="ml-1 opacity-70 tabular-nums"
              :class="categoryFilter === cat.id ? 'text-white/80' : ''"
              >{{ categoryCounts[cat.id] }}</span
            >
          </button>
        </div>

        <div class="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dp-text-muted)] pointer-events-none"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <AppInput
            v-model="search"
            placeholder="搜索工具名称或说明..."
            class="pl-9 pr-9"
            autocomplete="off"
            aria-label="搜索工具"
          />
          <button
            v-if="hasSearch"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-[var(--dp-text-muted)] hover:text-[var(--dp-text)] hover:bg-[var(--dp-surface-muted)] cursor-pointer transition-colors duration-[var(--dp-dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--dp-primary)]"
            aria-label="清除搜索"
            @click="clearSearch"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-4 h-4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto p-2 space-y-4 min-h-0 max-h-[14rem] lg:max-h-none">
        <template v-if="visibleCategories.length && totalVisibleTools">
          <section v-for="cat in visibleCategories" :key="cat.id">
            <h3
              class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dp-text-muted)] flex items-center justify-between"
            >
              <span>{{ cat.label }}</span>
              <span
                class="tabular-nums font-normal normal-case tracking-normal text-[var(--dp-text-muted)]"
              >
                {{ toolsInCategory(cat.id).length }}
              </span>
            </h3>
            <ul class="space-y-0.5" role="list">
              <li v-for="tool in toolsInCategory(cat.id)" :key="tool.id">
                <button
                  type="button"
                  class="group w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-[background-color,box-shadow] duration-[var(--dp-dur-fast)] cursor-pointer min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-primary)]"
                  :class="
                    activeId === tool.id
                      ? 'bg-[var(--dp-primary-soft)] text-[var(--dp-primary)] shadow-[inset_3px_0_0_0_var(--dp-primary)]'
                      : 'text-[var(--dp-text-secondary)] hover:bg-[var(--dp-surface-muted)] hover:text-[var(--dp-text)]'
                  "
                  :aria-current="activeId === tool.id ? 'true' : undefined"
                  @click="selectTool(tool.id)"
                >
                  <span
                    class="mt-0.5 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors duration-[var(--dp-dur-fast)]"
                    :class="
                      activeId === tool.id
                        ? 'bg-white/80 text-[var(--dp-primary)]'
                        : 'bg-[var(--dp-surface-muted)] text-[var(--dp-text-muted)] group-hover:text-[var(--dp-text-secondary)]'
                    "
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.75"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" :d="tool.icon" />
                    </svg>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span
                      class="block text-sm truncate"
                      :class="activeId === tool.id ? 'font-semibold' : 'font-medium'"
                      >{{ tool.label }}</span
                    >
                    <span
                      v-if="!hasSearch"
                      class="block text-xs text-[var(--dp-text-muted)] truncate mt-0.5 group-hover:text-[var(--dp-text-secondary)]"
                      >{{ tool.desc }}</span
                    >
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </template>
        <div v-else class="px-3 py-8 text-center space-y-3">
          <p class="text-sm text-[var(--dp-text-secondary)]">未找到匹配的工具</p>
          <p class="text-xs text-[var(--dp-text-muted)] leading-relaxed">
            试试缩短关键词，或切换「全部」分类
          </p>
          <button
            v-if="hasSearch || categoryFilter"
            type="button"
            class="text-xs font-semibold text-[var(--dp-primary)] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-primary)] rounded"
            @click="
              clearSearch();
              categoryFilter = null;
            "
          >
            清除筛选条件
          </button>
        </div>
      </nav>
    </aside>

    <!-- 工具操作区 -->
    <section id="tool-workspace" class="flex-1 min-w-0 flex flex-col min-h-0" tabindex="-1">
      <header
        v-if="activeMeta"
        class="mb-4 lg:mb-5 pb-4 border-b border-[var(--dp-border)] flex items-start justify-between gap-4"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl font-bold text-[var(--dp-text)]">{{ activeMeta.label }}</h2>
            <AppBadge variant="info">{{ activeCategoryLabel }}</AppBadge>
          </div>
          <p class="text-sm text-[var(--dp-text-secondary)] mt-1.5 leading-relaxed max-w-2xl">
            {{ activeMeta.desc }}
          </p>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto pb-4 min-h-0">
        <Transition name="tool-panel" mode="out-in">
          <div :key="activeId">
            <component :is="activeComponent" v-if="activeComponent" />
            <p v-else class="text-sm text-[var(--dp-text-muted)] p-6 text-center">
              未找到该工具的界面。
            </p>
          </div>
        </Transition>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tool-panel-enter-active,
.tool-panel-leave-active {
  transition:
    opacity var(--dp-dur) ease,
    transform var(--dp-dur) ease;
}
.tool-panel-enter-from,
.tool-panel-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
@media (prefers-reduced-motion: reduce) {
  .tool-panel-enter-active,
  .tool-panel-leave-active {
    transition: opacity 0.01ms;
  }
  .tool-panel-enter-from,
  .tool-panel-leave-to {
    transform: none;
  }
}
</style>
