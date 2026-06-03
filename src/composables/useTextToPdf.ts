import { ref } from "vue";
import { useToolRunner, pickSave, PDF_FILTERS } from "./useToolRunner";

export function useTextToPdf() {
  const text = ref("");
  const fontSize = ref(12);
  const outputPath = ref<string | null>(null);
  const { loading, error, message, data, execute } = useToolRunner("text_to_pdf");

  async function pickOutput() {
    const p = await pickSave("document.pdf", PDF_FILTERS);
    if (p) outputPath.value = p;
  }

  async function run() {
    if (!text.value.trim() || !outputPath.value) return;
    await execute({
      text: text.value,
      output_path: outputPath.value,
      font_size: fontSize.value,
    });
  }

  return { text, fontSize, outputPath, loading, error, message, data, pickOutput, run };
}
