<script setup lang="ts">
import { useMergePdf } from "../../../composables/useMergePdf";

const { inputPaths, result, error, loading, pickFiles, merge } = useMergePdf();
</script>

<template>
  <section class="border rounded p-4 max-w-lg">
    <h2 class="text-lg font-semibold mb-3">PDF 合并</h2>
    <button type="button" class="px-3 py-1 border rounded mr-2" @click="pickFiles">
      选择多个 PDF
    </button>
    <ul v-if="inputPaths.length" class="text-sm text-gray-600 mt-2 list-disc pl-5">
      <li v-for="p in inputPaths" :key="p">{{ p }}</li>
    </ul>
    <div class="mt-3">
      <button
        type="button"
        class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="inputPaths.length < 2 || loading"
        @click="merge"
      >
        {{ loading ? "合并中…" : "开始合并" }}
      </button>
    </div>
    <p v-if="error" class="text-red-600 mt-3 text-sm">{{ error }}</p>
    <div v-if="result" class="mt-3 text-sm">
      <p>共 {{ result.pageCount }} 页</p>
      <p>输出：{{ result.output }}</p>
    </div>
  </section>
</template>
