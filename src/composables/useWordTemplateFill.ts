import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export type ContentInputMode = "file" | "text";

interface TypesetFileResult {
  input: string;
  output: string;
}

interface GenerateResult {
  results: TypesetFileResult[];
  logs: string[];
}

const DOCX_FILTERS = [{ name: "Word 文档", extensions: ["docx"] }];
const CONTENT_FILTERS = [
  { name: "Word / 文本 / Markdown", extensions: ["docx", "txt", "md", "markdown"] },
];

export function useWordTemplateFill() {
  const templatePath = ref<string | null>(null);
  const contentMode = ref<ContentInputMode>("file");
  const contentPath = ref<string | null>(null);
  const contentText = ref("");
  const reporter = ref("");
  const reportDate = ref("");
  const logs = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastOutputPath = ref<string | null>(null);

  const canGenerate = computed(() => {
    if (!templatePath.value) return false;
    if (contentMode.value === "file") return Boolean(contentPath.value);
    return contentText.value.trim().length > 0;
  });

  function appendLog(line: string) {
    logs.value = [...logs.value, line];
  }

  function fileBasename(path: string) {
    return path.split(/[/\\]/).pop() || path;
  }

  async function pickTemplate() {
    const path = await open({
      multiple: false,
      filters: DOCX_FILTERS,
    });
    if (typeof path !== "string") return;
    templatePath.value = path;
    appendLog(`已选择模板: ${fileBasename(path)}`);
  }

  async function pickContentFile() {
    const path = await open({
      multiple: false,
      filters: CONTENT_FILTERS,
    });
    if (typeof path !== "string") return;
    contentPath.value = path;
    appendLog(`已选择内容: ${fileBasename(path)}`);
  }

  function clearTemplate() {
    templatePath.value = null;
    appendLog("已清除模板");
  }

  function clearContentFile() {
    contentPath.value = null;
    appendLog("已清除内容文件");
  }

  async function generate() {
    if (!templatePath.value) {
      error.value = "请先上传 Word 模板";
      return;
    }
    if (contentMode.value === "file" && !contentPath.value) {
      error.value = "请先上传内容文件";
      return;
    }
    if (contentMode.value === "text" && !contentText.value.trim()) {
      error.value = "请输入或粘贴内容";
      return;
    }

    const outputPath = await save({
      defaultPath: "生成报告.docx",
      filters: DOCX_FILTERS,
    });
    if (!outputPath) {
      appendLog("已取消保存");
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const contentKind =
        contentMode.value === "text"
          ? "text"
          : contentPath.value?.toLowerCase().endsWith(".md") ||
              contentPath.value?.toLowerCase().endsWith(".markdown")
            ? "markdown"
            : "text";

      const result = await invoke<GenerateResult>("generate_word_from_template", {
        templatePath: templatePath.value,
        outputPath,
        contentPath: contentMode.value === "file" ? contentPath.value : null,
        contentText: contentMode.value === "text" ? contentText.value : null,
        contentKind,
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
  };
}
