<script setup lang="ts">
import { computed } from "vue";
import { useCompressPdf } from "../../../composables/useCompressPdf";

const { inputPath, result, error, loading, pickFile, compress } = useCompressPdf();

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const ratio = computed(() => {
  if (!result.value) return 0;
  const diff = result.value.before - result.value.after;
  return Math.round((diff / result.value.before) * 100);
});
</script>

<template>
  <div class="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div class="p-6 space-y-6">
      <!-- File Selector Dropzone -->
      <div
        class="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
        :class="
          inputPath
            ? 'border-blue-200 bg-blue-50/20'
            : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
        "
        @click="pickFile"
      >
        <!-- No File Selected -->
        <template v-if="!inputPath">
          <div
            class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100"
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
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-700">选择 PDF 文件</p>
          <p class="text-xs text-slate-400 mt-1">点击浏览并选择需要压缩的文件</p>
        </template>

        <!-- File Selected -->
        <template v-else>
          <div
            class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 mb-3 border border-red-100"
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p
            class="text-sm font-semibold text-slate-800 text-center max-w-md truncate"
            :title="inputPath"
          >
            {{ inputPath.split("/").pop() || inputPath }}
          </p>
          <p class="text-xs text-slate-400 mt-1 max-w-md truncate" :title="inputPath">
            {{ inputPath }}
          </p>
          <button
            type="button"
            class="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium underline"
            @click.stop="pickFile"
          >
            重新选择
          </button>
        </template>
      </div>

      <!-- Action Button -->
      <div v-if="inputPath" class="flex justify-end">
        <button
          data-test="compress"
          type="button"
          class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 shadow-sm shadow-blue-100"
          :disabled="loading"
          @click="compress"
        >
          <svg
            v-if="loading"
            class="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>{{ loading ? "正在压缩..." : "开始压缩" }}</span>
        </button>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="w-5 h-5 shrink-0 mt-0.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div class="text-sm font-medium">{{ error }}</div>
      </div>

      <!-- Compression Result -->
      <div v-if="result" class="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
        <div class="flex items-center gap-3 text-emerald-600">
          <div
            class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100"
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
          <h3 class="text-base font-bold">压缩完成！</h3>
        </div>

        <!-- Size Comparison Bar -->
        <div class="space-y-2">
          <div class="flex justify-between text-xs font-semibold text-slate-500">
            <span>文件体积对比</span>
            <span class="text-blue-600">减少了 {{ ratio }}%</span>
          </div>
          <div class="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
            <div
              class="bg-blue-600 h-full transition-all duration-500"
              :style="{ width: `${100 - ratio}%` }"
            ></div>
            <div
              class="bg-emerald-400 h-full transition-all duration-500"
              :style="{ width: `${ratio}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-slate-400 font-medium">
            <span>压缩后: {{ formatBytes(result.after) }}</span>
            <span>压缩前: {{ formatBytes(result.before) }}</span>
          </div>
        </div>

        <!-- Output Path -->
        <div class="pt-2 border-t border-slate-200/60 space-y-1">
          <p class="text-xs font-semibold text-slate-400">输出路径</p>
          <p
            class="text-sm font-mono text-slate-600 bg-white border border-slate-100 rounded-lg p-2.5 select-all break-all"
          >
            {{ result.output }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
