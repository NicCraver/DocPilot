<script setup lang="ts">
import type { ToolCallRecord } from "../../agent/runner";

defineProps<{
  record: ToolCallRecord;
}>();
</script>

<template>
  <div class="border rounded p-2 text-xs bg-gray-50 mt-2">
    <p class="font-medium">工具：{{ record.toolName }}</p>
    <p class="text-gray-600 mt-1">参数：{{ JSON.stringify(record.args) }}</p>
    <p v-if="record.error" class="text-red-600 mt-1">错误：{{ record.error }}</p>
    <p v-else-if="record.result" class="text-gray-700 mt-1">
      结果：{{ JSON.stringify(record.result) }}
    </p>
  </div>
</template>
