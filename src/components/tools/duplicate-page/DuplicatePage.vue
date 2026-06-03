<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useDuplicatePage } from "../../../composables/useDuplicatePage";

const { inputPath, pageNumber, times, loading, error, message, data, pick, run } =
  useDuplicatePage();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择 PDF 文件"
    hint="复制指定页面"
    action-label="复制页面"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath" class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">页码</label
        ><input
          v-model.number="pageNumber"
          type="number"
          min="1"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">额外复制次数</label
        ><input
          v-model.number="times"
          type="number"
          min="1"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
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
