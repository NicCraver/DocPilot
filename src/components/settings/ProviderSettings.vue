<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useProviderSettings } from "../../composables/useProviderSettings";
import AppButton from "../ui/AppButton.vue";
import AppCard from "../ui/AppCard.vue";
import AppInput from "../ui/AppInput.vue";
import AppBadge from "../ui/AppBadge.vue";

const { settings, loaded, configuredByEnv, loadSettings, saveSettings } = useProviderSettings();
const isSaving = ref(false);
const showSavedToast = ref(false);

onMounted(() => {
  loadSettings();
});

async function onSave() {
  if (configuredByEnv.value) return;
  isSaving.value = true;
  await saveSettings();
  isSaving.value = false;
  showSavedToast.value = true;
  setTimeout(() => {
    showSavedToast.value = false;
  }, 3000);
}
</script>

<template>
  <AppCard padding="none" class="max-w-2xl">
    <div class="px-6 py-4 border-b border-[var(--dp-border)] bg-[var(--dp-surface-muted)]">
      <h2 class="text-base font-bold text-[var(--dp-text)]">大语言模型 API 配置</h2>
      <p class="text-xs text-[var(--dp-text-muted)] mt-1">
        通过项目根目录 <code class="font-mono text-[11px]">.env</code> 配置（推荐）；未设置
        <code class="font-mono text-[11px]">VITE_LLM_MODEL</code> 时可在下方表单保存到本地。
      </p>
    </div>

    <div class="p-6">
      <div v-if="!loaded" class="flex flex-col items-center justify-center py-14 space-y-3">
        <svg
          class="animate-spin h-7 w-7 text-[var(--dp-primary)]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p class="text-sm text-[var(--dp-text-muted)]">正在加载配置...</p>
      </div>

      <div v-else class="space-y-6">
        <div
          v-if="configuredByEnv"
          class="p-4 rounded-xl border border-emerald-200 bg-[var(--dp-success-soft)] text-sm text-emerald-900 space-y-2"
          role="status"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <AppBadge variant="success">已由 .env 配置</AppBadge>
            <span
              >修改后需重启 <code class="font-mono text-xs">tauri dev</code> / 重新构建生效。</span
            >
          </div>
          <p class="text-xs text-emerald-800/90 leading-relaxed">
            复制 <code class="font-mono">.env.example</code> 为
            <code class="font-mono">.env</code>，填写
            <code class="font-mono">VITE_LLM_BASE_URL</code>、<code class="font-mono"
              >VITE_LLM_API_KEY</code
            >、<code class="font-mono">VITE_LLM_MODEL</code>。
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="onSave">
          <div class="space-y-2">
            <label for="base-url" class="text-sm font-semibold text-[var(--dp-text)]">
              接口 Base URL
            </label>
            <AppInput
              id="base-url"
              v-model="settings.baseURL"
              type="url"
              placeholder="例如：https://api.openai.com/v1"
              autocomplete="url"
              class="font-mono"
              :readonly="configuredByEnv"
            />
            <p class="text-xs text-[var(--dp-text-muted)] leading-relaxed">
              环境变量：<code class="font-mono bg-slate-100 px-1 rounded">VITE_LLM_BASE_URL</code
              >。Ollama：
              <code class="font-mono bg-slate-100 px-1 rounded">http://localhost:11434/v1</code>
            </p>
          </div>

          <div class="space-y-2">
            <label for="api-key" class="text-sm font-semibold text-[var(--dp-text)]">
              API Key
            </label>
            <AppInput
              id="api-key"
              v-model="settings.apiKey"
              type="password"
              placeholder="输入 API 密钥（Ollama 可留空）"
              autocomplete="off"
              class="font-mono"
              :readonly="configuredByEnv"
            />
            <p class="text-xs text-[var(--dp-text-muted)]">
              环境变量：<code class="font-mono bg-slate-100 px-1 rounded">VITE_LLM_API_KEY</code>
            </p>
          </div>

          <div class="space-y-2">
            <label for="model-name" class="text-sm font-semibold text-[var(--dp-text)]">
              模型名称
            </label>
            <AppInput
              id="model-name"
              v-model="settings.model"
              placeholder="例如：gpt-4o、deepseek-chat、qwen2.5"
              class="font-mono"
              required
              :readonly="configuredByEnv"
            />
            <p class="text-xs text-[var(--dp-text-muted)]">
              环境变量：<code class="font-mono bg-slate-100 px-1 rounded">VITE_LLM_MODEL</code
              >（须支持 Tool Call）
            </p>
          </div>

          <div
            v-if="!configuredByEnv"
            class="pt-5 border-t border-[var(--dp-border)] flex flex-wrap items-center gap-4"
          >
            <AppButton type="submit" variant="primary" :loading="isSaving"> 保存到本地 </AppButton>

            <Transition name="fade">
              <AppBadge v-if="showSavedToast" variant="success">配置已保存</AppBadge>
            </Transition>
          </div>
        </form>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
