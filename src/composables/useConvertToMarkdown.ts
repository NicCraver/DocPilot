import { computed, ref } from "vue";
import { useToolRunner, pickFile, pickSave, fileStem } from "./useToolRunner";

const DOC_FILTERS = [
  {
    name: "文档与媒体",
    extensions: [
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "xls",
      "xlsx",
      "html",
      "htm",
      "csv",
      "json",
      "xml",
      "epub",
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "bmp",
      "wav",
      "mp3",
      "txt",
      "md",
    ],
  },
];

export function useConvertToMarkdown() {
  const inputPath = ref<string | null>(null);
  const outputPath = ref<string | null>(null);
  const usePlugins = ref(false);
  const { loading, error, message, data, execute } = useToolRunner("convert_to_markdown");

  const preview = computed(() => {
    const d = data.value;
    if (!d || typeof d.markdown_preview !== "string") return null;
    return {
      text: d.markdown_preview as string,
      truncated: Boolean(d.preview_truncated),
      charCount: typeof d.char_count === "number" ? d.char_count : undefined,
      output: typeof d.output_path === "string" ? d.output_path : undefined,
    };
  });

  function defaultOutputPath(input: string) {
    const slash = Math.max(input.lastIndexOf("/"), input.lastIndexOf("\\"));
    const dir = slash >= 0 ? input.slice(0, slash + 1) : "";
    return `${dir}${fileStem(input)}.md`;
  }

  async function pickInput() {
    const p = await pickFile(DOC_FILTERS);
    if (p) {
      inputPath.value = p;
      outputPath.value = defaultOutputPath(p);
    }
  }

  async function pickOutput() {
    if (!inputPath.value) return;
    const p = await pickSave(`${fileStem(inputPath.value)}.md`, [
      { name: "Markdown", extensions: ["md"] },
    ]);
    if (p) outputPath.value = p;
  }

  async function run() {
    if (!inputPath.value) return;
    await execute({
      input_path: inputPath.value,
      output_path: outputPath.value ?? undefined,
      use_plugins: usePlugins.value,
    });
  }

  return {
    inputPath,
    outputPath,
    usePlugins,
    loading,
    error,
    message,
    data,
    preview,
    pickInput,
    pickOutput,
    run,
  };
}
