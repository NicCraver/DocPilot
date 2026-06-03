<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useConvertImage } from "../../../composables/useConvertImage";

const { inputPath, outputPath, loading, error, message, data, pick, pickOutput, run } =
  useConvertImage();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择图片"
    hint="再选择输出路径（扩展名决定格式）"
    action-label="开始转换"
    :can-run="!!inputPath && !!outputPath"
    @pick="pick"
    @run="run"
  >
    <div v-if="inputPath" class="space-y-2">
      <button
        type="button"
        class="w-full py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50"
        @click="pickOutput"
      >
        {{ outputPath ? outputPath : "选择输出路径…" }}
      </button>
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
