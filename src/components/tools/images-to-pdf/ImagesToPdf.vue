<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useImagesToPdf } from "../../../composables/useImagesToPdf";

const { inputPaths, loading, error, message, data, pick, run } = useImagesToPdf();
</script>

<template>
  <div class="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div class="p-6 space-y-6">
      <div
        class="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer"
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
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          :disabled="loading || !inputPaths.length"
          @click="run"
        >
          {{ loading ? "处理中..." : "生成 PDF" }}
        </button>
      </div>
      <div v-if="error" class="p-4 bg-red-50 rounded-xl text-sm text-red-700">{{ error }}</div>
      <div v-if="message" class="p-4 bg-emerald-50 rounded-xl text-sm text-emerald-800">
        {{ message }}
      </div>
      <div v-if="data?.output_path" class="p-4 bg-slate-50 rounded-xl text-xs font-mono break-all">
        {{ data.output_path }}
      </div>
    </div>
  </div>
</template>
