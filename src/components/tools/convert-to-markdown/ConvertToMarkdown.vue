<script setup lang="ts">
import ToolPanel from "../shared/ToolPanel.vue";
import { useConvertToMarkdown } from "../../../composables/useConvertToMarkdown";

const {
  inputPath,
  outputPath,
  usePlugins,
  loading,
  error,
  message,
  preview,
  pickInput,
  pickOutput,
  run,
} = useConvertToMarkdown();
</script>

<template>
  <ToolPanel
    :path="inputPath"
    :loading="loading"
    :error="error"
    :message="message"
    title="选择要转换的文件"
    hint="支持 PDF、Office、图片、HTML、CSV 等（由 MarkItDown 提供）"
    action-label="转为 Markdown"
    @pick="pickInput"
    @run="run"
  >
    <div v-if="inputPath" class="space-y-3 text-sm">
      <label class="flex items-center gap-2 cursor-pointer text-[var(--dp-text)]">
        <input v-model="usePlugins" type="checkbox" class="rounded border-slate-300" />
        <span>启用 MarkItDown 插件（可选，需单独安装插件包）</span>
      </label>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-[var(--dp-text-muted)]">输出路径</span>
        <div class="flex gap-2">
          <input
            :value="outputPath ?? ''"
            type="text"
            readonly
            class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--dp-border)] bg-[var(--dp-surface-muted)] text-xs font-mono truncate"
            :title="outputPath ?? ''"
          />
          <button
            type="button"
            class="shrink-0 px-3 py-2 text-xs font-medium text-[var(--dp-primary)] border border-[var(--dp-border)] rounded-lg hover:bg-[var(--dp-surface-muted)]"
            @click="pickOutput"
          >
            另存为…
          </button>
        </div>
        <p class="text-xs text-[var(--dp-text-muted)]">留空则默认同目录、同名 .md</p>
      </div>
    </div>

    <template #result>
      <div v-if="preview" class="space-y-3">
        <div class="flex justify-between text-xs text-[var(--dp-text-muted)]">
          <span v-if="preview.charCount">共 {{ preview.charCount }} 字符</span>
          <span v-if="preview.output" class="truncate max-w-[60%]" :title="preview.output">
            {{ preview.output }}
          </span>
        </div>
        <pre
          class="p-4 max-h-80 overflow-auto text-xs leading-relaxed bg-slate-50 border border-slate-100 rounded-xl whitespace-pre-wrap break-words text-slate-800">{{ preview.text }}<span v-if="preview.truncated" class="text-slate-400">…</span></pre>
        <p v-if="preview.truncated" class="text-xs text-[var(--dp-text-muted)]">
          预览已截断，完整内容见输出 .md 文件。
        </p>
      </div>
    </template>
  </ToolPanel>
</template>
