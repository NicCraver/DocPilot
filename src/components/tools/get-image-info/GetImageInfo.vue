<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useGetImageInfo } from "../../../composables/useGetImageInfo";

const { inputPath, loading, error, message, data, pick, run } = useGetImageInfo();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择图片"
    hint="查看宽高、格式与大小"
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
          <span class="text-slate-500 shrink-0">宽度</span
          ><span class="font-medium text-right break-all">{{ data.width }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">高度</span
          ><span class="font-medium text-right break-all">{{ data.height }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">格式</span
          ><span class="font-medium text-right break-all">{{ data.format }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">大小（字节）</span
          ><span class="font-medium text-right break-all">{{ data.size }}</span>
        </div>
      </div>
    </template>
  </ToolPanel>
</template>
