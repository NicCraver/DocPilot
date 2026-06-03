<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useComputeHash } from "../../../composables/useComputeHash";

const { path, algorithm, loading, error, message, data, pick, run } = useComputeHash();
</script>

<template>
  <ToolPanel
    :path="path"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择文件"
    hint="计算 MD5 或 SHA256"
    action-label="计算哈希"
    @pick="pick"
    @run="run"
  >
    <div v-if="path">
      <label class="block text-xs font-semibold text-slate-500 mb-1">算法</label>
      <select
        v-model="algorithm"
        class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="md5">MD5</option>
        <option value="sha256">SHA256</option>
      </select>
    </div>
    <template #result>
      <div
        v-if="data"
        class="p-4 bg-slate-50 border border-slate-100 rounded-xl grid gap-2 text-sm"
      >
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">算法</span
          ><span class="font-medium text-right break-all">{{ data.algorithm }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-slate-500 shrink-0">哈希值</span
          ><span class="font-medium text-right break-all">{{ data.hash }}</span>
        </div>
      </div>
    </template>
  </ToolPanel>
</template>
