<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useRotatePdf } from "../../../composables/useRotatePdf";

const { inputPath, degrees, pageList, loading, error, message, data, pick, run } = useRotatePdf();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择 PDF 文件"
    hint="旋转指定页或全部页"
    action-label="开始旋转"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath" class="space-y-3">
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">旋转角度</label>
        <select
          v-model.number="degrees"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option :value="90">90°</option>
          <option :value="180">180°</option>
          <option :value="270">270°</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1"
          >页码列表（可选，留空为全部）</label
        >
        <input
          v-model="pageList"
          type="text"
          placeholder="1,3,5"
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
