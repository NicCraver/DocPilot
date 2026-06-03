<script setup lang="ts">
import { ref } from "vue";
import CompressPdf from "./compress-pdf/CompressPdf.vue";
import MergePdf from "./merge-pdf/MergePdf.vue";
import SplitPdf from "./split-pdf/SplitPdf.vue";

type ToolId = "compress_pdf" | "merge_pdf" | "split_pdf";
const active = ref<ToolId>("compress_pdf");

const tools: { id: ToolId; label: string }[] = [
  { id: "compress_pdf", label: "PDF 压缩" },
  { id: "merge_pdf", label: "PDF 合并" },
  { id: "split_pdf", label: "PDF 拆分" },
];
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="t in tools"
        :key="t.id"
        type="button"
        class="px-3 py-1 rounded border text-sm"
        :class="active === t.id ? 'bg-blue-600 text-white border-blue-600' : ''"
        @click="active = t.id"
      >
        {{ t.label }}
      </button>
    </div>
    <CompressPdf v-if="active === 'compress_pdf'" />
    <MergePdf v-else-if="active === 'merge_pdf'" />
    <SplitPdf v-else />
  </div>
</template>
