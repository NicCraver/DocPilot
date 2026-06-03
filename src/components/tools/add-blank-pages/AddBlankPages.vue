<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useAddBlankPages } from "../../../composables/useAddBlankPages";

const { inputPath, count, afterPage, loading, error, message, data, pick, run } =
  useAddBlankPages();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择 PDF 文件"
    hint="在指定位置插入空白页"
    action-label="插入空白页"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath" class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">空白页数量</label
        ><input
          v-model.number="count"
          type="number"
          min="1"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">插入位置（0=开头）</label
        ><input
          v-model.number="afterPage"
          type="number"
          min="0"
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
