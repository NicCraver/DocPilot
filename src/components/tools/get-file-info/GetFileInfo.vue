<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useGetFileInfo } from "../../../composables/useGetFileInfo";

const { path, loading, error, message, data, pick, run } = useGetFileInfo();
</script>

<template>
  <ToolPanel
    :path="path"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择文件"
    hint="查看文件元数据"
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
          <span class="text-slate-500 shrink-0">路径</span
          ><span class="font-medium text-right break-all">{{ data.path }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">文件名</span
          ><span class="font-medium text-right break-all">{{ data.file_name }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">大小</span
          ><span class="font-medium text-right break-all">{{ data.size }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">是否目录</span
          ><span class="font-medium text-right break-all">{{ data.is_dir }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">扩展名</span
          ><span class="font-medium text-right break-all">{{ data.extension }}</span>
        </div>
      </div>
    </template>
  </ToolPanel>
</template>
