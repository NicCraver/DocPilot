<script setup lang="ts">
import { useSplitPdf } from "../../../composables/useSplitPdf";
import AppButton from "../../ui/AppButton.vue";
import AppCard from "../../ui/AppCard.vue";

const { inputPath, startPage, endPage, result, error, loading, pickFile, split } = useSplitPdf();
</script>

<template>
  <AppCard padding="md" class="max-w-2xl">
    <div class="space-y-6">
      <button
        type="button"
        class="w-full border-2 border-dashed rounded-[var(--dp-radius-xl)] p-8 flex flex-col items-center justify-center transition-colors duration-[var(--dp-dur-fast)] cursor-pointer min-h-[10rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-primary)]"
        :class="
          inputPath
            ? 'border-blue-200 bg-[var(--dp-primary-soft)]/40'
            : 'border-[var(--dp-border-strong)] hover:border-[var(--dp-primary)] hover:bg-[var(--dp-surface-muted)]'
        "
        :aria-label="inputPath ? '已选择文件，点击重新选择' : '选择 PDF 文件'"
        @click="pickFile"
      >
        <template v-if="!inputPath">
          <div
            class="w-12 h-12 rounded-xl bg-[var(--dp-surface-muted)] flex items-center justify-center text-[var(--dp-text-muted)] mb-3"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-[var(--dp-text)]">选择 PDF 文件</p>
          <p class="text-xs text-[var(--dp-text-muted)] mt-1 text-center max-w-xs">
            点击浏览并选择需要拆分的文件
          </p>
        </template>
        <template v-else>
          <p
            class="text-sm font-semibold text-[var(--dp-text)] text-center max-w-md truncate"
            :title="inputPath"
          >
            {{ inputPath.split("/").pop() || inputPath }}
          </p>
          <p
            class="text-xs text-[var(--dp-text-muted)] mt-1 max-w-md truncate text-center"
            :title="inputPath"
          >
            {{ inputPath }}
          </p>
          <span class="mt-3 text-xs text-[var(--dp-primary)] font-medium">点击重新选择</span>
        </template>
      </button>

      <fieldset v-if="inputPath" class="space-y-3 border-0 p-0 m-0">
        <legend class="text-xs font-bold text-[var(--dp-text-muted)] uppercase tracking-wider">
          拆分页码范围
        </legend>
        <div
          class="flex items-center gap-3 p-4 bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] rounded-xl max-w-md"
        >
          <label class="flex items-center gap-2 flex-1 min-w-0">
            <span class="text-xs font-semibold text-[var(--dp-text-secondary)] shrink-0"
              >起始页</span
            >
            <input
              v-model.number="startPage"
              type="number"
              min="1"
              class="w-full h-10 border border-[var(--dp-border-strong)] rounded-lg px-3 text-sm bg-[var(--dp-surface)] text-[var(--dp-text)] focus:outline-none focus:border-[var(--dp-primary)] focus:shadow-[var(--dp-ring)] transition-[border-color,box-shadow] duration-[var(--dp-dur-fast)]"
            />
          </label>
          <span class="text-[var(--dp-border-strong)] shrink-0" aria-hidden="true">
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
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </span>
          <label class="flex items-center gap-2 flex-1 min-w-0">
            <span class="text-xs font-semibold text-[var(--dp-text-secondary)] shrink-0"
              >结束页</span
            >
            <input
              v-model.number="endPage"
              type="number"
              min="1"
              class="w-full h-10 border border-[var(--dp-border-strong)] rounded-lg px-3 text-sm bg-[var(--dp-surface)] text-[var(--dp-text)] focus:outline-none focus:border-[var(--dp-primary)] focus:shadow-[var(--dp-ring)] transition-[border-color,box-shadow] duration-[var(--dp-dur-fast)]"
            />
          </label>
        </div>
      </fieldset>

      <div v-if="inputPath" class="flex justify-end pt-1">
        <AppButton variant="primary" data-test="tool-run" :loading="loading" @click="split">
          {{ loading ? "正在拆分..." : "开始拆分" }}
        </AppButton>
      </div>

      <div
        v-if="error"
        role="alert"
        class="p-4 bg-[var(--dp-danger-soft)] border border-red-200 rounded-xl text-sm text-red-800"
      >
        {{ error }}
      </div>

      <div
        v-if="result"
        class="p-5 bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] space-y-4"
        role="status"
      >
        <div class="flex items-center gap-3 text-[var(--dp-success)]">
          <div
            class="w-8 h-8 rounded-full bg-[var(--dp-success-soft)] flex items-center justify-center border border-emerald-200"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 class="text-base font-bold text-[var(--dp-text)]">拆分完成</h3>
        </div>

        <p class="text-sm text-[var(--dp-text-secondary)]">
          共
          <strong class="text-[var(--dp-text)] font-semibold tabular-nums">{{
            result.pageCount
          }}</strong>
          页
        </p>

        <div class="pt-2 border-t border-[var(--dp-border)] space-y-1">
          <p class="text-xs font-semibold text-[var(--dp-text-muted)]">输出路径</p>
          <p
            class="text-sm font-mono text-[var(--dp-text-secondary)] bg-[var(--dp-surface)] border border-[var(--dp-border)] rounded-lg p-2.5 select-all break-all"
          >
            {{ result.output }}
          </p>
        </div>
      </div>
    </div>
  </AppCard>
</template>
