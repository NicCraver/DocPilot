<script setup lang="ts">
import { useSplitPdf } from "../../../composables/useSplitPdf";

const { inputPath, startPage, endPage, result, error, loading, pickFile, split } = useSplitPdf();
</script>

<template>
  <section class="border rounded p-4 max-w-lg">
    <h2 class="text-lg font-semibold mb-3">PDF 拆分</h2>
    <button type="button" class="px-3 py-1 border rounded mr-2" @click="pickFile">选择 PDF</button>
    <span v-if="inputPath" class="text-sm text-gray-600">{{ inputPath }}</span>

    <div class="flex gap-3 mt-3 text-sm items-center">
      <label
        >起始页
        <input v-model.number="startPage" type="number" min="1" class="border rounded w-16 px-1"
      /></label>
      <label
        >结束页
        <input v-model.number="endPage" type="number" min="1" class="border rounded w-16 px-1"
      /></label>
    </div>

    <div class="mt-3">
      <button
        type="button"
        class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="!inputPath || loading"
        @click="split"
      >
        {{ loading ? "拆分中…" : "开始拆分" }}
      </button>
    </div>
    <p v-if="error" class="text-red-600 mt-3 text-sm">{{ error }}</p>
    <div v-if="result" class="mt-3 text-sm">
      <p>输出 {{ result.pageCount }} 页</p>
      <p>路径：{{ result.output }}</p>
    </div>
  </section>
</template>
