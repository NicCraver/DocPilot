<script setup lang="ts">
import { ref } from "vue";
import { useWordTemplateFill } from "../../composables/useWordTemplateFill";
import AppButton from "../ui/AppButton.vue";

const {
  templatePath,
  contentMode,
  contentPath,
  contentText,
  reporter,
  reportDate,
  logs,
  loading,
  error,
  lastOutputPath,
  canGenerate,
  fileBasename,
  pickTemplate,
  pickContentFile,
  clearTemplate,
  clearContentFile,
  generate,
} = useWordTemplateFill();

const logsExpanded = ref(false);
</script>

<template>
  <div class="flex flex-col gap-4 min-h-0 flex-1">
    <p class="text-sm text-[var(--dp-text-secondary)] shrink-0 max-w-3xl leading-relaxed">
      上传 Word 模板与您的文稿（Word / 文本 / Markdown），一键生成与模板版式一致的
      .docx。自动移除红色填写说明，并按章节标题匹配填入正文。
    </p>

    <div class="flex flex-col xl:flex-row gap-5 min-h-0 flex-1">
      <aside
        class="w-full xl:w-[26rem] shrink-0 flex flex-col gap-4 border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] bg-[var(--dp-surface)] shadow-[var(--dp-shadow-sm)] overflow-hidden p-4"
      >
        <section class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-semibold text-[var(--dp-text-secondary)]">1. Word 模板</h3>
            <span
              v-if="templatePath"
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--dp-primary-soft)] text-[var(--dp-primary)]"
            >
              已选
            </span>
          </div>
          <div
            class="min-h-[4.5rem] rounded-xl border border-dashed border-[var(--dp-border)] bg-[var(--dp-surface-muted)] p-3 flex flex-col justify-center gap-2"
          >
            <p v-if="templatePath" class="text-sm font-medium text-[var(--dp-text)] truncate">
              {{ fileBasename(templatePath) }}
            </p>
            <p v-else class="text-xs text-[var(--dp-text-muted)]">选择 .docx 模板文件</p>
            <div class="flex gap-2">
              <button type="button" class="toolbar-btn flex-1" @click="pickTemplate">
                <span class="i-lucide-upload w-3.5 h-3.5" aria-hidden="true" />
                上传模板
              </button>
              <button v-if="templatePath" type="button" class="toolbar-btn" @click="clearTemplate">
                <span class="i-lucide-x w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <h3 class="text-xs font-semibold text-[var(--dp-text-secondary)]">2. 您的内容</h3>
          <div
            class="p-1.5 border border-[var(--dp-border)] rounded-lg bg-[var(--dp-surface-muted)]"
            role="tablist"
          >
            <div class="grid grid-cols-2 gap-1">
              <button
                type="button"
                role="tab"
                class="mode-tab"
                :class="contentMode === 'file' ? 'mode-tab--active' : ''"
                @click="contentMode = 'file'"
              >
                <span class="i-lucide-file-up w-4 h-4" aria-hidden="true" />
                上传文件
              </button>
              <button
                type="button"
                role="tab"
                class="mode-tab"
                :class="contentMode === 'text' ? 'mode-tab--active' : ''"
                @click="contentMode = 'text'"
              >
                <span class="i-lucide-align-left w-4 h-4" aria-hidden="true" />
                粘贴文本
              </button>
            </div>
          </div>

          <template v-if="contentMode === 'file'">
            <div
              class="min-h-[4.5rem] rounded-xl border border-dashed border-[var(--dp-border)] bg-[var(--dp-surface-muted)] p-3 flex flex-col justify-center gap-2"
            >
              <p v-if="contentPath" class="text-sm font-medium text-[var(--dp-text)] truncate">
                {{ fileBasename(contentPath) }}
              </p>
              <p v-else class="text-xs text-[var(--dp-text-muted)]">支持 .docx / .txt / .md</p>
              <div class="flex gap-2">
                <button type="button" class="toolbar-btn flex-1" @click="pickContentFile">
                  <span class="i-lucide-file-plus w-3.5 h-3.5" aria-hidden="true" />
                  上传内容
                </button>
                <button
                  v-if="contentPath"
                  type="button"
                  class="toolbar-btn"
                  @click="clearContentFile"
                >
                  <span class="i-lucide-x w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <textarea
              v-model="contentText"
              class="field-textarea min-h-[12rem]"
              placeholder="粘贴 Markdown 或纯文本。用 # 标题 或「前言」「2.1 工作成果」等章节名分段…"
            />
          </template>
        </section>

        <section class="grid grid-cols-2 gap-2">
          <label class="field-label">
            <span>汇报人（可选）</span>
            <input v-model="reporter" type="text" class="field-input" placeholder="如：张三" />
          </label>
          <label class="field-label">
            <span>日期（可选）</span>
            <input
              v-model="reportDate"
              type="text"
              class="field-input"
              placeholder="如：2026年1月15日"
            />
          </label>
        </section>

        <AppButton
          class="w-full"
          variant="primary"
          size="md"
          :loading="loading"
          :disabled="!canGenerate"
          @click="generate"
        >
          {{ loading ? "生成中…" : "生成 Word" }}
        </AppButton>

        <p
          v-if="lastOutputPath"
          class="text-xs text-[var(--dp-text-secondary)] break-all leading-relaxed"
        >
          最近输出：{{ lastOutputPath }}
        </p>

        <div
          v-if="error"
          role="alert"
          class="p-3 rounded-xl bg-[var(--dp-danger-soft)] border border-red-200 text-xs text-red-800 leading-relaxed"
        >
          {{ error }}
        </div>

        <div class="border-t border-[var(--dp-border)] pt-3">
          <button
            type="button"
            class="w-full flex items-center justify-between gap-2 text-xs font-semibold text-[var(--dp-text-muted)] cursor-pointer py-1"
            :aria-expanded="logsExpanded"
            @click="logsExpanded = !logsExpanded"
          >
            <span class="flex items-center gap-1.5">
              <span class="i-lucide-terminal w-3.5 h-3.5" aria-hidden="true" />
              运行日志
            </span>
            <span
              class="i-lucide-chevron-down w-4 h-4 transition-transform"
              :class="logsExpanded ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div
            v-show="logsExpanded"
            class="mt-2 h-28 overflow-y-auto text-[11px] font-mono log-panel rounded-lg p-2.5"
          >
            <p v-if="!logs.length" class="text-[var(--dp-text-muted)] text-center py-4">暂无日志</p>
            <p v-for="(line, i) in logs" :key="i" class="leading-relaxed">{{ line }}</p>
          </div>
        </div>
      </aside>

      <section
        class="flex-1 min-w-0 border border-[var(--dp-border)] rounded-[var(--dp-radius-xl)] bg-[var(--dp-surface)] shadow-[var(--dp-shadow-sm)] overflow-hidden flex flex-col"
      >
        <div class="px-5 py-4 border-b border-[var(--dp-border)] bg-[var(--dp-surface-muted)]/60">
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-[var(--dp-primary-soft)] text-[var(--dp-primary)] flex items-center justify-center"
            >
              <span class="i-lucide-book-open-text w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-[var(--dp-text)]">使用说明</h3>
              <p class="text-xs text-[var(--dp-text-muted)] mt-0.5">按模板章节结构组织您的内容</p>
            </div>
          </div>
        </div>

        <div
          class="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-[var(--dp-text-secondary)] leading-relaxed"
        >
          <div class="info-card">
            <p class="font-semibold text-[var(--dp-text)] mb-2">推荐内容结构</p>
            <ul class="list-disc pl-5 space-y-1.5">
              <li>前言</li>
              <li>2.1 工作成果与核心贡献</li>
              <li>2.2 工作复盘与反思</li>
              <li>个人岗位胜任度与能力评估</li>
              <li>2026 年度个人五要点、工作计划</li>
              <li>未来展望与规划</li>
              <li>结语</li>
            </ul>
          </div>
          <div class="info-card">
            <p class="font-semibold text-[var(--dp-text)] mb-2">生成规则</p>
            <ul class="list-disc pl-5 space-y-1.5">
              <li>保留模板页眉页脚、标题样式与版心设置</li>
              <li>自动删除红色斜体填写说明与调查问卷引导</li>
              <li>正文统一为小四号宋体、1.5 倍行距（与模板要求一致）</li>
              <li>章节按标题关键词匹配；Markdown 可用 <code class="code"># 标题</code> 分段</li>
            </ul>
          </div>
          <div class="info-card">
            <p class="font-semibold text-[var(--dp-text)] mb-2">测试样例</p>
            <p>
              项目内已包含美腾科技 2025 年终总结模板与约 2000 字测试文稿，路径：
              <code class="code">scripts/word-template-test-data/</code>。本地可执行
              <code class="code">pnpm run word-template:test</code> 验证。
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mode-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  cursor: pointer;
  transition: background-color var(--dp-dur-fast) ease;
}

.mode-tab--active {
  color: var(--dp-primary);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-sm);
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.625rem;
  border-radius: var(--dp-radius-md);
  border: 1px solid var(--dp-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
  background: var(--dp-surface);
  cursor: pointer;
}

.toolbar-btn:hover {
  background: var(--dp-surface-muted);
  color: var(--dp-text);
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--dp-text-muted);
}

.field-input {
  min-height: 2.375rem;
  padding: 0 0.625rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  font-size: 0.8125rem;
  color: var(--dp-text);
  background: var(--dp-surface);
}

.field-input:focus {
  outline: none;
  border-color: var(--dp-primary);
  box-shadow: var(--dp-ring);
}

.field-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--dp-text);
  background: var(--dp-surface);
  resize: vertical;
}

.field-textarea:focus {
  outline: none;
  border-color: var(--dp-primary);
  box-shadow: var(--dp-ring);
}

.log-panel {
  background: var(--dp-surface-muted);
  border: 1px solid var(--dp-border);
}

.info-card {
  padding: 1rem 1.125rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface-muted);
}

.code {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
}
</style>
