<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useCompressImage } from "../../../composables/useCompressImage";

const { inputPath, quality, loading, error, message, data, pick, run } = useCompressImage();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择图片"
    hint="JPEG 质量压缩，输出 .jpg"
    action-label="开始压缩"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath" class="space-y-2">
      <label class="block text-xs font-semibold text-slate-500 mb-1">质量 (1-100)</label>
      <input v-model.number="quality" type="range" min="1" max="100" class="w-full" />
      <p class="text-xs text-slate-400 text-center">{{ quality }}</p>
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
