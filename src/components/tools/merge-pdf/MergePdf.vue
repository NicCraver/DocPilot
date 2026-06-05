<script setup lang="ts">
import { useMergePdf } from "../../../composables/useMergePdf";
import AppButton from "../../ui/AppButton.vue";
import AppCard from "../../ui/AppCard.vue";

const { inputPaths, result, error, loading, pickFiles, merge } = useMergePdf();
</script>

<template>
  <AppCard padding="md" class="max-w-2xl">
    <div class="space-y-6">
      <button
        type="button"
        class="w-full border-2 border-dashed rounded-[var(--dp-radius-xl)] p-8 flex flex-col items-center justify-center transition-colors duration-[var(--dp-dur-fast)] cursor-pointer min-h-[10rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-primary)]"
        :class="
          inputPaths.length
            ? 'border-blue-200 bg-[var(--dp-primary-soft)]/40'
            : 'border-[var(--dp-border-strong)] hover:border-[var(--dp-primary)] hover:bg-[var(--dp-surface-muted)]'
        "
        :aria-label="inputPaths.length ? '已选择文件，点击重新选择' : '选择多个 PDF 文件'"
        @click="pickFiles"
      >
        <template v-if="!inputPaths.length">
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
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p class="text-sm font-semibold text-[var(--dp-text)]">选择多个 PDF 文件</p>
          <p class="text-xs text-[var(--dp-text-muted)] mt-1 text-center max-w-xs">
            点击浏览并选择两个或更多需要合并的文件
          </p>
        </template>
        <template v-else>
          <div
            class="w-12 h-12 rounded-xl bg-[var(--dp-primary-soft)] flex items-center justify-center text-[var(--dp-primary)] mb-3"
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-[var(--dp-text)]">
            已选择 {{ inputPaths.length }} 个文件
          </p>
          <span class="mt-3 text-xs text-[var(--dp-primary)] font-medium">点击重新选择</span>
        </template>
      </button>

      <div v-if="inputPaths.length" class="space-y-2">
        <div class="flex justify-between items-center gap-2">
          <h3 class="text-xs font-bold text-[var(--dp-text-muted)] uppercase tracking-wider">
            待合并文件（按顺序）
          </h3>
          <span
            v-if="inputPaths.length < 2"
            class="text-xs text-amber-700 font-medium flex items-center gap-1 shrink-0"
            role="status"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            至少 2 个文件
          </span>
        </div>
        <ul class="space-y-2 max-h-60 overflow-y-auto pr-1" role="list">
          <li
            v-for="(path, index) in inputPaths"
            :key="path"
            class="flex items-center gap-3 p-3 bg-[var(--dp-surface-muted)] border border-[var(--dp-border)] rounded-xl"
          >
            <span
              class="w-6 h-6 rounded-full bg-[var(--dp-border)] text-[var(--dp-text-secondary)] flex items-center justify-center text-xs font-bold tabular-nums shrink-0"
              aria-hidden="true"
              >{{ index + 1 }}</span
            >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-[var(--dp-text)] truncate" :title="path">
                {{ path.split("/").pop() }}
              </p>
              <p class="text-xs text-[var(--dp-text-muted)] truncate" :title="path">{{ path }}</p>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="inputPaths.length" class="flex justify-end pt-1">
        <AppButton
          variant="primary"
          data-test="tool-run"
          :loading="loading"
          :disabled="inputPaths.length < 2"
          @click="merge"
        >
          {{ loading ? "正在合并..." : "开始合并" }}
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
          <h3 class="text-base font-bold text-[var(--dp-text)]">合并完成</h3>
        </div>

        <p class="text-sm text-[var(--dp-text-secondary)]">
          合并后共
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
