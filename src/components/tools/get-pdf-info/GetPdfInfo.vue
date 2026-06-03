<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useGetPdfInfo } from "../../../composables/useGetPdfInfo";

const { inputPath, loading, error, message, data, pick, run } = useGetPdfInfo();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择 PDF 文件"
    hint="查看页数、大小与版本"
    action-label="读取信息"
    @pick="pick"
    @run="run"
  >
    <template #result>
      <div
        v-if="data"
        class="p-4 bg-slate-50 border border-slate-100 rounded-xl grid gap-2 text-sm"
      >
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">页数</span
          ><span class="font-medium text-right break-all">{{ data.page_count }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">文件大小（字节）</span
          ><span class="font-medium text-right break-all">{{ data.file_size }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">版本</span
          ><span class="font-medium text-right break-all">{{ data.version }}</span>
        </div>
      </div>
    </template>
  </ToolPanel>
</template>
