<script setup lang="ts">
import { ref } from "vue";
import { pickSave, useToolRunner } from "../../../composables/useToolRunner";
import { defaultWordTypesetConfig } from "../../../lib/wordTypesetConfig";

const text = ref("");
const { loading, error, message, execute } = useToolRunner("format_docx_text");

async function run() {
  const output_path = await pickSave("排版结果.docx", [{ name: "Word", extensions: ["docx"] }]);
  if (!output_path) return;
  await execute({
    text: text.value,
    output_path,
    config: defaultWordTypesetConfig(),
  });
}
</script>

<template>
  <div class="space-y-4 max-w-xl">
    <textarea
      v-model="text"
      class="w-full min-h-40 border border-[var(--dp-border)] rounded-xl p-3 text-sm"
      placeholder="输入待排版文本…"
    />
    <button
      type="button"
      class="h-9 px-4 rounded-lg bg-[var(--dp-primary)] text-white text-sm font-medium disabled:opacity-50"
      :disabled="loading || !text.trim()"
      @click="run"
    >
      {{ loading ? "生成中…" : "生成 Word" }}
    </button>
    <p v-if="message" class="text-sm text-emerald-700">{{ message }}</p>
    <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
  </div>
</template>
