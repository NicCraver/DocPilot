<script setup lang="ts">
import { computed, ref } from "vue";
import ToolsHome from "./components/tools/ToolsHome.vue";
import AgentCraftDemo from "./components/agent/layouts/AgentCraftDemo.vue";
import ProviderSettings from "./components/settings/ProviderSettings.vue";
import WordTypeset from "./components/word-typeset/WordTypeset.vue";
import AppNavItem from "./components/ui/AppNavItem.vue";
import AppBadge from "./components/ui/AppBadge.vue";

type Tab = "agent" | "tools" | "word-typeset" | "settings";
const tab = ref<Tab>("agent");

const isFullWidthTab = computed(() => tab.value === "agent" || tab.value === "word-typeset");

const tabMeta = computed(() => {
  switch (tab.value) {
    case "agent":
      return {
        title: "Craft Demo",
        desc: "会话面板 + 工具编排 + 权限确认（Craft 布局，接入 DocPilot 工具链）",
      };
    case "tools":
      return { title: "PDF 工具箱", desc: "本地批量处理与格式转换" };
    case "word-typeset":
      return { title: "Word 批量排版", desc: "批量统一页边距、标题、正文与表格样式" };
    case "settings":
      return { title: "系统设置", desc: "配置大模型 API 连接" };
  }
});
</script>

<template>
  <div class="h-full flex bg-[var(--dp-bg)] text-[var(--dp-text)] antialiased">
    <aside
      class="w-[17.5rem] shrink-0 flex flex-col border-r border-[var(--dp-border)] bg-[var(--dp-surface)]"
      aria-label="主导航"
    >
      <div class="p-5 border-b border-[var(--dp-border)]">
        <div class="flex items-center gap-3">
          <div
            class="w-11 h-11 rounded-xl bg-[var(--dp-primary)] flex items-center justify-center text-white shadow-[var(--dp-shadow)]"
            aria-hidden="true"
          >
            <span class="i-lucide-file-text w-6 h-6" />
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight text-[var(--dp-text)]">DocPilot</h1>
            <p class="text-xs text-[var(--dp-text-muted)] font-medium">智能 PDF 助手</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="功能模块">
        <p
          class="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--dp-text-muted)]"
        >
          核心功能
        </p>

        <AppNavItem :active="tab === 'agent'" label="Craft Demo" @click="tab = 'agent'">
          <template #icon>
            <span class="i-lucide-list-tree w-5 h-5" />
          </template>
        </AppNavItem>

        <p
          class="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--dp-text-muted)]"
        >
          工具
        </p>

        <AppNavItem :active="tab === 'tools'" label="PDF 工具箱" @click="tab = 'tools'">
          <template #icon>
            <span class="i-lucide-wrench w-5 h-5" />
          </template>
        </AppNavItem>

        <AppNavItem
          :active="tab === 'word-typeset'"
          label="Word 批量排版"
          @click="tab = 'word-typeset'"
        >
          <template #icon>
            <span class="i-lucide-file-type w-5 h-5" />
          </template>
        </AppNavItem>

        <AppNavItem :active="tab === 'settings'" label="系统设置" @click="tab = 'settings'">
          <template #icon>
            <span class="i-lucide-settings w-5 h-5" />
          </template>
        </AppNavItem>
      </nav>

      <div class="p-5 border-t border-[var(--dp-border)]">
        <div class="flex items-center gap-3 px-1">
          <div
            class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold"
            aria-hidden="true"
          >
            DP
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-[var(--dp-text)] truncate">DocPilot Desktop</p>
            <p class="text-xs text-[var(--dp-text-muted)]">v0.1.0 · 本地运行</p>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header
        class="h-16 shrink-0 px-8 flex items-center justify-between border-b border-[var(--dp-border)] bg-[var(--dp-surface)]/80 backdrop-blur-sm"
      >
        <div>
          <p class="text-xs font-medium text-[var(--dp-text-muted)] uppercase tracking-wide">
            当前模块
          </p>
          <h2 class="text-base font-semibold text-[var(--dp-text)] leading-tight">
            {{ tabMeta.title }}
          </h2>
        </div>
        <AppBadge variant="success" pulse>本地服务正常</AppBadge>
      </header>

      <div class="flex-1 overflow-hidden flex flex-col min-h-0">
        <div
          class="flex-1 min-h-0 px-8 py-6 flex flex-col"
          :class="isFullWidthTab ? 'overflow-hidden' : 'overflow-y-auto'"
        >
          <p v-if="!isFullWidthTab" class="text-sm text-[var(--dp-text-secondary)] mb-5 max-w-3xl">
            {{ tabMeta.desc }}
          </p>

          <Transition name="page" mode="out-in">
            <div
              :key="tab"
              :class="
                isFullWidthTab
                  ? 'flex-1 min-h-0 min-w-0 flex flex-col w-full max-w-none'
                  : 'h-full max-w-6xl mx-auto w-full'
              "
            >
              <AgentCraftDemo v-if="tab === 'agent'" />
              <ToolsHome v-else-if="tab === 'tools'" />
              <WordTypeset v-else-if="tab === 'word-typeset'" />
              <ProviderSettings v-else />
            </div>
          </Transition>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity 0.01ms;
  }
  .page-enter-from,
  .page-leave-to {
    transform: none;
  }
}
</style>
