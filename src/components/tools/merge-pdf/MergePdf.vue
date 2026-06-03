<script setup lang="ts">
import { useMergePdf } from "../../../composables/useMergePdf";

const { inputPaths, result, error, loading, pickFiles, merge } = useMergePdf();
</script>

<template>
  <div class="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div class="p-6 space-y-6">
      <!-- File Selector Dropzone -->
      <div
        class="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
        :class="
          inputPaths.length
            ? 'border-blue-200 bg-blue-50/20'
            : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
        "
        @click="pickFiles"
      >
        <!-- No Files Selected -->
        <template v-if="!inputPaths.length">
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
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-700">选择多个 PDF 文件</p>
          <p class="text-xs text-slate-400 mt-1">点击浏览并选择两个或更多需要合并的文件</p>
        </template>

        <!-- Files Selected -->
        <template v-else>
          <div
            class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mb-3 border border-blue-100"
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
          <p class="text-sm font-semibold text-slate-800 text-center">
            已选择 {{ inputPaths.length }} 个文件
          </p>
          <button
            type="button"
            class="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium underline"
            @click.stop="pickFiles"
          >
            重新选择
          </button>
        </template>
      </div>

      <!-- Selected Files List -->
      <div v-if="inputPaths.length" class="space-y-2">
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">
            待合并文件列表（按顺序）
          </h3>
          <span
            v-if="inputPaths.length < 2"
            class="text-xs text-amber-600 font-medium flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            请至少选择 2 个文件
          </span>
        </div>
        <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div
            v-for="(path, index) in inputPaths"
            :key="path"
            class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl"
          >
            <span
              class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold"
            >
              {{ index + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-semibold text-slate-700 truncate"
                :title="path.split('/').pop()"
              >
                {{ path.split("/").pop() }}
              </p>
              <p class="text-[10px] text-slate-400 truncate" :title="path">
                {{ path }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div v-if="inputPaths.length" class="flex justify-end">
        <button
          type="button"
          class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 shadow-sm shadow-blue-100"
          :disabled="inputPaths.length < 2 || loading"
          @click="merge"
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
          <span>{{ loading ? "正在合并..." : "开始合并" }}</span>
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

      <!-- Merge Result -->
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
          <h3 class="text-base font-bold">合并完成！</h3>
        </div>

        <div class="flex items-center gap-2 text-sm text-slate-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5 text-slate-400"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span
            >合并后文件共
            <strong class="text-slate-800 font-semibold">{{ result.pageCount }}</strong> 页</span
          >
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
