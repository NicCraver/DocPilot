<script setup lang="ts">
import { ref } from "vue";
import ToolsHome from "./components/tools/ToolsHome.vue";
import AgentChat from "./components/agent/AgentChat.vue";
import ProviderSettings from "./components/settings/ProviderSettings.vue";

type Tab = "tools" | "agent" | "settings";
const tab = ref<Tab>("agent");
</script>

<template>
  <main class="p-6">
    <h1 class="text-2xl font-bold mb-4">DocPilot</h1>
    <nav class="flex gap-2 mb-4">
      <button
        type="button"
        class="px-3 py-1 rounded border"
        :class="tab === 'tools' ? 'bg-blue-600 text-white border-blue-600' : ''"
        @click="tab = 'tools'"
      >
        工具
      </button>
      <button
        type="button"
        class="px-3 py-1 rounded border"
        :class="tab === 'agent' ? 'bg-blue-600 text-white border-blue-600' : ''"
        @click="tab = 'agent'"
      >
        Agent
      </button>
      <button
        type="button"
        class="px-3 py-1 rounded border"
        :class="tab === 'settings' ? 'bg-blue-600 text-white border-blue-600' : ''"
        @click="tab = 'settings'"
      >
        设置
      </button>
    </nav>
    <ToolsHome v-if="tab === 'tools'" />
    <AgentChat v-else-if="tab === 'agent'" />
    <ProviderSettings v-else />
  </main>
</template>
