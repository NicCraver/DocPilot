<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useCropImage } from "../../../composables/useCropImage";

const { inputPath, x, y, width, height, loading, error, message, data, pick, run } = useCropImage();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择图片"
    hint="裁剪指定区域"
    action-label="开始裁剪"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath" class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">X</label
        ><input
          v-model.number="x"
          type="number"
          min="0"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">Y</label
        ><input
          v-model.number="y"
          type="number"
          min="0"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">宽度</label
        ><input
          v-model.number="width"
          type="number"
          min="1"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">高度</label
        ><input
          v-model.number="height"
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
