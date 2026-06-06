import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import type {
  AdaptiveInput,
  SmartDocContentMode,
  SmartDocFillResult,
  SmartDocProfile,
  TemplateMeta,
} from "../lib/smartDocTypes";
import { loadCurrentTemplateId, saveCurrentTemplateId } from "../lib/smartDocStore";
import { generateSections } from "../agent/smartDocGenerate";
import type { ProviderSettings } from "./useProviderSettings";

const DOCX_FILTERS = [{ name: "Word 文档", extensions: ["docx"] }];
const CONTENT_FILTERS = [
  { name: "Word / 文本 / Markdown", extensions: ["docx", "txt", "md", "markdown"] },
];

export function useWordSmartDoc() {
  const templates = ref<TemplateMeta[]>([]);
  const currentId = ref<string | null>(null);
  const currentProfile = ref<SmartDocProfile | null>(null);

  const contentMode = ref<SmartDocContentMode>("adaptive");
  const adaptiveInput = ref<AdaptiveInput>("text");
  const contentPath = ref<string | null>(null);
  const contentText = ref("");
  const topic = ref("");
  const hints = ref("");
  const reporter = ref("");
  const reportDate = ref("");
  const generatedSections = ref<Record<string, string[]> | null>(null);

  const logs = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastOutputPath = ref<string | null>(null);

  const currentTemplate = computed(
    () => templates.value.find((t) => t.id === currentId.value) ?? null,
  );
  const canGenerate = computed(() => {
    if (!currentId.value) return false;
    if (contentMode.value === "llm") return generatedSections.value != null;
    if (adaptiveInput.value === "file") return Boolean(contentPath.value);
    return contentText.value.trim().length > 0;
  });

  function appendLog(line: string) {
    logs.value = [...logs.value, line];
  }
  function fileBasename(path: string) {
    return path.split(/[/\\]/).pop() || path;
  }

  async function refreshTemplates() {
    try {
      templates.value = await invoke<TemplateMeta[]>("smart_doc_list_templates");
      const saved = await loadCurrentTemplateId();
      if (saved && templates.value.some((t) => t.id === saved)) {
        currentId.value = saved;
      } else if (!currentId.value && templates.value.length) {
        currentId.value = templates.value[0].id;
      }
      if (currentId.value) await loadProfile(currentId.value);
    } catch (e) {
      error.value = String(e);
    }
  }

  async function loadProfile(id: string) {
    try {
      currentProfile.value = await invoke<SmartDocProfile>("smart_doc_get_profile", { id });
    } catch (e) {
      currentProfile.value = null;
      error.value = String(e);
    }
  }

  async function selectTemplate(id: string) {
    currentId.value = id;
    generatedSections.value = null;
    await saveCurrentTemplateId(id);
    await loadProfile(id);
  }

  async function learnTemplate() {
    const path = await open({ multiple: false, filters: DOCX_FILTERS });
    if (typeof path !== "string") return;
    loading.value = true;
    error.value = null;
    try {
      appendLog(`正在学习模板: ${fileBasename(path)}`);
      const meta = await invoke<TemplateMeta>("smart_doc_learn_template", { docxPath: path });
      appendLog(`学习完成: ${meta.name}（${meta.section_count} 章节）`);
      await refreshTemplates();
      await selectTemplate(meta.id);
    } catch (e) {
      error.value = String(e);
      appendLog(`学习失败: ${String(e)}`);
    } finally {
      loading.value = false;
    }
  }

  async function renameTemplate(id: string, name: string) {
    await invoke("smart_doc_rename_template", { id, name });
    await refreshTemplates();
  }

  async function deleteTemplate(id: string) {
    await invoke("smart_doc_delete_template", { id });
    if (currentId.value === id) {
      currentId.value = null;
      currentProfile.value = null;
      await saveCurrentTemplateId(null);
    }
    await refreshTemplates();
  }

  async function deleteTemplateWithConfirm(id: string, name: string) {
    const ok = await ask(`确定删除模板「${name}」？此操作不可恢复。`, {
      title: "删除模板",
      kind: "warning",
    });
    if (ok) await deleteTemplate(id);
  }

  async function pickContentFile() {
    const path = await open({ multiple: false, filters: CONTENT_FILTERS });
    if (typeof path !== "string") return;
    contentPath.value = path;
    appendLog(`已选择内容: ${fileBasename(path)}`);
  }

  async function runLlmGenerate(settings: ProviderSettings) {
    if (!currentProfile.value) {
      error.value = "请先选择模板";
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      appendLog("正在调用模型生成内容…");
      generatedSections.value = await generateSections({
        topic: topic.value,
        hints: hints.value,
        structure: currentProfile.value.structure,
        settings,
      });
      appendLog(`模型已生成 ${Object.keys(generatedSections.value).length} 个章节`);
    } catch (e) {
      error.value = String(e);
      appendLog(`生成失败: ${String(e)}`);
    } finally {
      loading.value = false;
    }
  }

  async function generate() {
    if (!currentId.value) {
      error.value = "请先选择模板";
      return;
    }
    const outputPath = await save({ defaultPath: "生成文档.docx", filters: DOCX_FILTERS });
    if (!outputPath) {
      appendLog("已取消保存");
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const isLlm = contentMode.value === "llm";
      const contentKind = isLlm
        ? "sections"
        : adaptiveInput.value === "text"
          ? "text"
          : contentPath.value?.toLowerCase().match(/\.(md|markdown)$/)
            ? "markdown"
            : "text";
      const result = await invoke<SmartDocFillResult>("smart_doc_generate", {
        id: currentId.value,
        outputPath,
        contentKind,
        contentPath: !isLlm && adaptiveInput.value === "file" ? contentPath.value : null,
        contentText: !isLlm && adaptiveInput.value === "text" ? contentText.value : null,
        sections: isLlm ? generatedSections.value : null,
        reporter: reporter.value.trim() || null,
        reportDate: reportDate.value.trim() || null,
      });
      for (const line of result.logs) appendLog(line);
      lastOutputPath.value = result.results[0]?.output ?? outputPath;
      appendLog(`生成完成: ${lastOutputPath.value}`);
    } catch (e) {
      error.value = String(e);
      appendLog(`错误: ${String(e)}`);
    } finally {
      loading.value = false;
    }
  }

  return {
    templates,
    currentId,
    currentProfile,
    currentTemplate,
    contentMode,
    adaptiveInput,
    contentPath,
    contentText,
    topic,
    hints,
    reporter,
    reportDate,
    generatedSections,
    logs,
    loading,
    error,
    lastOutputPath,
    canGenerate,
    fileBasename,
    refreshTemplates,
    selectTemplate,
    learnTemplate,
    renameTemplate,
    deleteTemplate,
    deleteTemplateWithConfirm,
    pickContentFile,
    runLlmGenerate,
    generate,
  };
}
