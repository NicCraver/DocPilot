<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useDeletePages } from "../../../composables/useDeletePages";

const { inputPath, pageList, loading, error, message, data, pick, run } = useDeletePages();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择 PDF 文件"
    hint="删除指定页面"
    action-label="开始删除"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath">
      <label class="block text-xs font-semibold text-slate-500 mb-1">要删除的页码</label
      ><input
        v-model="pageList"
        type="text"
        class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
    <template #result>
      <div
        v-if="data?.output_path"
        class="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm"
      >
        <p class="text-xs text-slate-500 mb-1">输出路径</p>
        <p class="font-mono text-xs break-all">{{ data.output_path }}</p>
      </div>
    </template>
  </ToolPanel>
</template>
