<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useRotateImage } from "../../../composables/useRotateImage";

const { inputPath, degrees, loading, error, message, data, pick, run } = useRotateImage();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择图片"
    hint="旋转 90° / 180° / 270°"
    action-label="开始旋转"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath">
      <label class="block text-xs font-semibold text-slate-500 mb-1">角度</label>
      <select
        v-model.number="degrees"
        class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option :value="90">90°</option>
        <option :value="180">180°</option>
        <option :value="270">270°</option>
      </select>
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
