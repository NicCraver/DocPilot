<script setup lang="ts">
defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
  trySample: [];
  selectPreset: [id: string];
}>();
</script>

<template>
  <div v-if="open" class="onboarding-overlay" role="dialog" aria-modal="true" aria-label="欢迎使用">
    <div class="onboarding-card">
      <div class="onboarding-icon" aria-hidden="true">
        <span class="i-lucide-file-type w-8 h-8" />
      </div>
      <h3 class="text-lg font-bold text-[var(--dp-text)]">欢迎使用 Word 批量排版</h3>
      <p class="text-sm text-[var(--dp-text-secondary)] leading-relaxed">
        选择场景方案 → 添加 docx 或输入文本 →
        开始排版。支持机关公文、学位论文、学术期刊三套内置方案，也可保存自定义方案。
      </p>

      <div class="onboarding-presets">
        <button type="button" class="preset-pick" @click="emit('selectPreset', 'government')">
          <span class="i-lucide-landmark w-4 h-4" />
          机关公文
        </button>
        <button type="button" class="preset-pick" @click="emit('selectPreset', 'thesis')">
          <span class="i-lucide-graduation-cap w-4 h-4" />
          学位论文
        </button>
        <button type="button" class="preset-pick" @click="emit('selectPreset', 'journal')">
          <span class="i-lucide-newspaper w-4 h-4" />
          学术期刊
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          class="onboarding-btn onboarding-btn--primary"
          @click="emit('trySample')"
        >
          生成样例 docx 试排
        </button>
        <button type="button" class="onboarding-btn" @click="emit('dismiss')">开始使用</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(15 23 42 / 0.45);
  backdrop-filter: blur(4px);
}

.onboarding-card {
  width: min(28rem, 100%);
  padding: 1.5rem;
  border-radius: var(--dp-radius-xl);
  border: 1px solid var(--dp-border);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-md);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.onboarding-icon {
  width: 3rem;
  height: 3rem;
  margin-inline: auto;
  border-radius: var(--dp-radius-lg);
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.onboarding-card h3,
.onboarding-card > p {
  text-align: center;
}

.onboarding-presets {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1 1 5.5rem;
  max-width: 7.5rem;
  min-height: 5rem;
  padding: 0.625rem 0.5rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  font-size: 0.6875rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
  color: var(--dp-text-secondary);
  background: var(--dp-surface-muted);
  cursor: pointer;
}

.preset-pick:hover {
  border-color: var(--dp-primary);
  color: var(--dp-primary);
  background: var(--dp-primary-soft);
}

.onboarding-btn {
  flex: 1;
  min-height: 2.75rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  background: var(--dp-surface);
  cursor: pointer;
}

.onboarding-btn--primary {
  background: var(--dp-primary);
  border-color: transparent;
  color: white;
}
</style>
