<script setup lang="ts">
import { useCompressPdf } from "../../../composables/useCompressPdf";

const { inputPath, result, error, loading, pickFile, compress } = useCompressPdf();
</script>

<template>
  <section class="border rounded p-4 max-w-lg">
    <h2 class="text-lg font-semibold mb-3">PDF 压缩</h2>
    <button data-test="pick-file" class="px-3 py-1 border rounded mr-2" @click="pickFile">
      选择 PDF
    </button>
    <span v-if="inputPath" class="text-sm text-gray-600">{{ inputPath }}</span>

    <div class="mt-3">
      <button
        data-test="compress"
        class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="!inputPath || loading"
        @click="compress"
      >
        {{ loading ? "压缩中…" : "开始压缩" }}
      </button>
    </div>

    <p v-if="error" class="text-red-600 mt-3">{{ error }}</p>
    <div v-if="result" class="mt-3 text-sm">
      <p>压缩前：{{ result.before }} 字节</p>
      <p>压缩后：{{ result.after }} 字节</p>
      <p>输出：{{ result.output }}</p>
    </div>
  </section>
</template>
