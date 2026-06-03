<script setup lang="ts">
import { useMergeImages } from "../../../composables/useMergeImages";

const { inputPaths, outputPath, horizontal, loading, error, message, data, pick, pickOutput, run } =
  useMergeImages();
</script>

<template>
  <div class="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div class="p-6 space-y-6">
      <div
        class="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all"
        :class="
          inputPaths.length
            ? 'border-blue-200 bg-blue-50/20'
            : 'border-slate-200 hover:border-blue-400'
        "
        @click="pick"
      >
        <p class="text-sm font-semibold text-slate-700">
          {{ inputPaths.length ? `已选 ${inputPaths.length} 张图片` : "选择多张图片" }}
        </p>
        <p v-if="!inputPaths.length" class="text-xs text-slate-400 mt-1">至少 2 张</p>
      </div>
      <label v-if="inputPaths.length >= 2" class="flex items-center gap-2 text-sm text-slate-600">
        <input v-model="horizontal" type="checkbox" class="rounded" /> 横向拼接（取消则为纵向）
      </label>
      <button
        v-if="inputPaths.length >= 2"
        type="button"
        class="w-full py-2 border border-slate-200 rounded-xl text-sm"
        @click="pickOutput"
      >
        {{ outputPath || "选择保存路径…" }}
      </button>
      <div class="flex justify-end">
        <button
          type="button"
          class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          :disabled="loading || inputPaths.length < 2 || !outputPath"
          @click="run"
        >
          {{ loading ? "处理中..." : "开始拼接" }}
        </button>
      </div>
      <div v-if="error" class="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
        {{ error }}
      </div>
      <div
        v-if="message"
        class="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800"
      >
        {{ message }}
      </div>
    </div>
  </div>
</template>
