<script setup lang="ts">
import { onMounted } from "vue";
import { useProviderSettings } from "../../composables/useProviderSettings";

const { settings, loaded, loadSettings, saveSettings } = useProviderSettings();

onMounted(() => {
  loadSettings();
});

async function onSave() {
  await saveSettings();
}
</script>

<template>
  <section class="border rounded p-4 max-w-lg">
    <h2 class="text-lg font-semibold mb-3">模型 Provider</h2>
    <p v-if="!loaded" class="text-sm text-gray-500">加载中…</p>
    <form v-else class="flex flex-col gap-3" @submit.prevent="onSave">
      <label class="flex flex-col gap-1 text-sm">
        <span>Base URL（OpenAI 兼容，Ollama 示例：http://localhost:11434/v1）</span>
        <input v-model="settings.baseURL" class="border rounded px-2 py-1" type="url" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        <span>API Key</span>
        <input v-model="settings.apiKey" class="border rounded px-2 py-1" type="password" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        <span>模型名称</span>
        <input v-model="settings.model" class="border rounded px-2 py-1" type="text" />
      </label>
      <button type="submit" class="px-3 py-1 bg-blue-600 text-white rounded w-fit">保存</button>
    </form>
  </section>
</template>
