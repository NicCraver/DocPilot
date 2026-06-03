<script setup lang="ts">
import { useTextToPdf } from "../../../composables/useTextToPdf";

const { text, fontSize, outputPath, loading, error, message, data, pickOutput, run } =
  useTextToPdf();
</script>

<template>
  <div
    class="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6"
  >
    <div>
      <label class="block text-xs font-semibold text-slate-500 mb-1">文本内容</label>
      <textarea
        v-model="text"
        rows="8"
        class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        placeholder="输入要写入 PDF 的文本…"
      />
    </div>
    <div>
      <label class="block text-xs font-semibold text-slate-500 mb-1">字号</label>
      <input
        v-model.number="fontSize"
        type="number"
        min="6"
        max="72"
        class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
      />
    </div>
    <button
      type="button"
      class="w-full py-2 border border-slate-200 rounded-xl text-sm"
      @click="pickOutput"
    >
      {{ outputPath || "选择保存 PDF 路径…" }}
    </button>
    <div class="flex justify-end">
      <button
        type="button"
        class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        :disabled="loading || !text.trim() || !outputPath"
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
</template>
