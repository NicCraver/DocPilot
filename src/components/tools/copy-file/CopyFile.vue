<script setup lang="ts">
import { useCopyFile } from "../../../composables/useCopyFile";

const { src, dest, loading, error, message, data, pickSrc, pickDest, run } = useCopyFile();
</script>

<template>
  <div
    class="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6"
  >
    <div
      class="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer"
      :class="src ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200'"
      @click="pickSrc"
    >
      <p class="text-sm font-semibold text-slate-700">
        {{ src ? src.split("/").pop() : "选择源文件" }}
      </p>
      <p v-if="src" class="text-xs text-slate-400 mt-1 truncate">{{ src }}</p>
    </div>
    <button
      v-if="src"
      type="button"
      class="w-full py-2 border border-slate-200 rounded-xl text-sm"
      @click="pickDest"
    >
      {{ dest || "选择目标路径…" }}
    </button>
    <div class="flex justify-end">
      <button
        type="button"
        class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        :disabled="loading || !src || !dest"
        @click="run"
      >
        {{ loading ? "处理中..." : "开始复制" }}
      </button>
    </div>
    <div v-if="error" class="p-4 bg-red-50 rounded-xl text-sm text-red-700">{{ error }}</div>
    <div v-if="message" class="p-4 bg-emerald-50 rounded-xl text-sm text-emerald-800">
      {{ message }}
    </div>
  </div>
</template>
