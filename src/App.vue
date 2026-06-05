<script setup lang="ts">
import { computed, ref } from "vue";
import ToolsHome from "./components/tools/ToolsHome.vue";
import AgentChat from "./components/agent/AgentChat.vue";
import ProviderSettings from "./components/settings/ProviderSettings.vue";
import AppNavItem from "./components/ui/AppNavItem.vue";
import AppBadge from "./components/ui/AppBadge.vue";

type Tab = "tools" | "agent" | "settings";
const tab = ref<Tab>("agent");

const tabMeta = computed(() => {
  switch (tab.value) {
    case "agent":
      return { title: "AI 智能助手", desc: "用自然语言处理 PDF 文档" };
    case "tools":
      return { title: "PDF 工具箱", desc: "本地批量处理与格式转换" };
    case "settings":
      return { title: "系统设置", desc: "配置大模型 API 连接" };
  }
});
</script>

<template>
  <div class="h-full flex bg-[var(--dp-bg)] text-[var(--dp-text)] antialiased">
    <!-- 侧边栏 -->
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight text-[var(--dp-text)]">DocPilot</h1>
            <p class="text-xs text-[var(--dp-text-muted)] font-medium">智能 PDF 助手</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-1" aria-label="功能模块">
        <AppNavItem :active="tab === 'agent'" label="AI 智能助手" @click="tab = 'agent'">
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </template>
        </AppNavItem>

        <AppNavItem :active="tab === 'tools'" label="PDF 工具箱" @click="tab = 'tools'">
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.51m5.108-.233c.55-.164 1.163-.099 1.583.238l.792.792c.54.54.54 1.415 0 1.955l-.792.792a1.125 1.125 0 01-1.583.238l-1.83-1.83"
              />
            </svg>
          </template>
        </AppNavItem>

        <AppNavItem :active="tab === 'settings'" label="系统设置" @click="tab = 'settings'">
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
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

    <!-- 主区域 -->
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
          :class="tab === 'agent' ? 'overflow-hidden' : 'overflow-y-auto'"
        >
          <p v-if="tab !== 'agent'" class="text-sm text-[var(--dp-text-secondary)] mb-5 max-w-3xl">
            {{ tabMeta.desc }}
          </p>

          <Transition name="page" mode="out-in">
            <div
              :key="tab"
              :class="
                tab === 'agent'
                  ? 'flex-1 min-h-0 min-w-0 flex flex-col w-full max-w-none'
                  : 'h-full max-w-6xl mx-auto w-full'
              "
            >
              <ToolsHome v-if="tab === 'tools'" />
              <AgentChat v-else-if="tab === 'agent'" />
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
