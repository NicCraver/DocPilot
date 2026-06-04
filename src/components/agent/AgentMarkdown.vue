<script setup lang="ts">
import MarkdownRender from "markstream-vue";

const props = defineProps<{
  content: string;
  /** 当前消息是否仍在流式生成 */
  streaming?: boolean;
}>();
</script>

<template>
  <div class="markstream-vue agent-markdown min-w-0">
    <MarkdownRender
      :content="content"
      :final="!streaming"
      :max-live-nodes="0"
      :batch-rendering="true"
      :render-code-blocks-as-pre="true"
      :fade="false"
      :smooth-streaming="streaming ? 'auto' : false"
      :typewriter="streaming"
      :is-dark="false"
    />
  </div>
</template>

<style scoped>
.agent-markdown {
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

.agent-markdown :deep(.markstream-vue) {
  word-break: break-word;
}
</style>
