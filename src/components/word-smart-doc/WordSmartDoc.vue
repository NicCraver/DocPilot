<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppButton from "../ui/AppButton.vue";
import { useWordSmartDoc } from "../../composables/useWordSmartDoc";
import { useProviderSettings } from "../../composables/useProviderSettings";

type Pane = "library" | "learn" | "generate";
const pane = ref<Pane>("library");

const sd = useWordSmartDoc();
const provider = useProviderSettings();
const showLogs = ref(true);

onMounted(async () => {
  await provider.loadSettings();
  await sd.refreshTemplates();
});

async function onRename(id: string, current: string) {
  const name = window.prompt("重命名模板", current);
  if (name && name.trim()) await sd.renameTemplate(id, name.trim());
}

async function onDelete(id: string, name: string) {
  await sd.deleteTemplateWithConfirm(id, name);
}

async function onSelectAndGenerate(id: string) {
  await sd.selectTemplate(id);
  pane.value = "generate";
}
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col gap-4">
    <div class="flex gap-1 p-1 rounded-xl bg-[var(--dp-surface-2,#f1f5f9)] w-fit">
      <button
        v-for="p in ['library', 'learn', 'generate'] as Pane[]"
        :key="p"
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition"
        :class="
          pane === p ? 'bg-white shadow text-[var(--dp-primary)]' : 'text-[var(--dp-text-muted)]'
        "
        @click="pane = p"
      >
        {{ p === "library" ? "模板库" : p === "learn" ? "学习新模板" : "生成文档" }}
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">
      <section v-if="pane === 'library'" class="space-y-4">
        <div
          v-if="!sd.templates.value.length"
          class="text-center py-16 text-[var(--dp-text-muted)]"
        >
          <span class="i-lucide-folder-open w-10 h-10 mx-auto block opacity-40" />
          <p class="mt-3">还没有模板，去「学习新模板」上传一份 Word 吧。</p>
          <AppButton class="mt-4" @click="pane = 'learn'">学习新模板</AppButton>
        </div>
        <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="t in sd.templates.value"
            :key="t.id"
            class="rounded-xl border p-4 flex flex-col gap-2 transition"
            :class="
              sd.currentId.value === t.id
                ? 'border-[var(--dp-primary)] ring-1 ring-[var(--dp-primary)]'
                : 'border-[var(--dp-border)]'
            "
          >
            <div class="flex items-center gap-2">
              <span class="i-lucide-file-text w-5 h-5 text-[var(--dp-primary)]" />
              <span class="font-semibold truncate flex-1">{{ t.name }}</span>
            </div>
            <p class="text-xs text-[var(--dp-text-muted)]">{{ t.section_count }} 个章节</p>
            <div class="flex gap-2 mt-auto pt-2">
              <AppButton size="sm" @click="onSelectAndGenerate(t.id)">使用</AppButton>
              <AppButton size="sm" variant="ghost" @click="onRename(t.id, t.name)"
                >重命名</AppButton
              >
              <AppButton size="sm" variant="ghost" @click="onDelete(t.id, t.name)">删除</AppButton>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="pane === 'learn'" class="max-w-xl space-y-4">
        <p class="text-sm text-[var(--dp-text-secondary)]">
          上传一份 Word（.docx），系统会学习其页面设置、标题/正文样式与章节结构，存入模板库。
        </p>
        <AppButton :loading="sd.loading.value" @click="sd.learnTemplate()">
          选择 Word 并学习
        </AppButton>
        <div
          v-if="sd.currentProfile.value && sd.currentTemplate.value"
          class="rounded-xl border border-[var(--dp-border)] p-4"
        >
          <p class="font-semibold mb-2">已学习：{{ sd.currentTemplate.value.name }}</p>
          <ul class="text-sm space-y-1">
            <li
              v-for="s in sd.currentProfile.value.structure"
              :key="s.key"
              class="text-[var(--dp-text-secondary)]"
            >
              <span class="text-[var(--dp-text-muted)]">L{{ s.level }}</span> · {{ s.title }}
            </li>
          </ul>
        </div>
      </section>

      <section v-else class="space-y-4">
        <div v-if="!sd.currentTemplate.value" class="text-[var(--dp-text-muted)]">
          请先在「模板库」选择一个模板。
        </div>
        <template v-else>
          <div class="rounded-xl border border-[var(--dp-border)] p-3 flex items-center gap-2">
            <span class="i-lucide-file-check w-5 h-5 text-[var(--dp-primary)]" />
            <span class="font-medium">当前模板：{{ sd.currentTemplate.value.name }}</span>
            <span class="text-xs text-[var(--dp-text-muted)]"
              >{{ sd.currentTemplate.value.section_count }} 章节</span
            >
          </div>

          <div class="flex gap-1 p-1 rounded-lg bg-[var(--dp-surface-2,#f1f5f9)] w-fit">
            <button
              class="px-3 py-1 rounded text-sm"
              :class="
                sd.contentMode.value === 'adaptive'
                  ? 'bg-white shadow text-[var(--dp-primary)]'
                  : 'text-[var(--dp-text-muted)]'
              "
              @click="sd.contentMode.value = 'adaptive'"
            >
              现成内容
            </button>
            <button
              class="px-3 py-1 rounded text-sm"
              :class="
                sd.contentMode.value === 'llm'
                  ? 'bg-white shadow text-[var(--dp-primary)]'
                  : 'text-[var(--dp-text-muted)]'
              "
              @click="sd.contentMode.value = 'llm'"
            >
              LLM 生成
            </button>
          </div>

          <div v-if="sd.contentMode.value === 'adaptive'" class="space-y-3">
            <div class="flex gap-2 text-sm">
              <label class="flex items-center gap-1">
                <input type="radio" value="text" v-model="sd.adaptiveInput.value" /> 粘贴文本
              </label>
              <label class="flex items-center gap-1">
                <input type="radio" value="file" v-model="sd.adaptiveInput.value" /> 上传文件
              </label>
            </div>
            <textarea
              v-if="sd.adaptiveInput.value === 'text'"
              v-model="sd.contentText.value"
              rows="8"
              class="w-full rounded-lg border border-[var(--dp-border)] p-3 text-sm"
              placeholder="粘贴 Markdown / 纯文本内容，用 # 标题对应章节…"
            />
            <div v-else class="flex items-center gap-2">
              <AppButton variant="ghost" @click="sd.pickContentFile()">选择内容文件</AppButton>
              <span class="text-sm text-[var(--dp-text-muted)] truncate">
                {{
                  sd.contentPath.value
                    ? sd.fileBasename(sd.contentPath.value)
                    : "未选择（docx/txt/md）"
                }}
              </span>
            </div>
          </div>

          <div v-else class="space-y-3">
            <input
              v-model="sd.topic.value"
              class="w-full rounded-lg border border-[var(--dp-border)] p-2.5 text-sm"
              placeholder="文档主题，例如：2025 年度个人工作总结"
            />
            <textarea
              v-model="sd.hints.value"
              rows="4"
              class="w-full rounded-lg border border-[var(--dp-border)] p-3 text-sm"
              placeholder="要点提示（可选）：列出希望覆盖的关键事项…"
            />
            <AppButton
              :loading="sd.loading.value"
              @click="sd.runLlmGenerate(provider.settings.value)"
            >
              用模型生成内容
            </AppButton>
            <div
              v-if="sd.generatedSections.value"
              class="rounded-xl border border-[var(--dp-border)] p-3 space-y-2 text-sm max-h-64 overflow-y-auto"
            >
              <div v-for="(paras, key) in sd.generatedSections.value" :key="key">
                <p class="font-semibold text-[var(--dp-primary)]">{{ key }}</p>
                <p v-for="(p, i) in paras" :key="i" class="text-[var(--dp-text-secondary)]">
                  {{ p }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <input
              v-model="sd.reporter.value"
              class="flex-1 rounded-lg border border-[var(--dp-border)] p-2 text-sm"
              placeholder="汇报人（可选）"
            />
            <input
              v-model="sd.reportDate.value"
              class="flex-1 rounded-lg border border-[var(--dp-border)] p-2 text-sm"
              placeholder="日期（可选）"
            />
          </div>

          <AppButton
            :loading="sd.loading.value"
            :disabled="!sd.canGenerate.value"
            @click="sd.generate()"
          >
            生成 Word
          </AppButton>
        </template>
      </section>
    </div>

    <p v-if="sd.error.value" class="text-sm text-red-600">{{ sd.error.value }}</p>
    <div v-if="sd.logs.value.length" class="rounded-xl border border-[var(--dp-border)]">
      <button
        class="w-full px-4 py-2 flex items-center justify-between text-sm font-medium"
        @click="showLogs = !showLogs"
      >
        <span>运行日志（{{ sd.logs.value.length }}）</span>
        <span :class="showLogs ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-4 h-4" />
      </button>
      <pre
        v-if="showLogs"
        class="px-4 pb-3 text-xs text-[var(--dp-text-muted)] whitespace-pre-wrap max-h-40 overflow-y-auto"
        >{{ sd.logs.value.join("\n") }}</pre
      >
    </div>
  </div>
</template>
