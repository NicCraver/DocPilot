import type { ModelMessage } from "ai";

const PATH_BLOCK = /【用户已选本地路径】/;

/** 从最近一条 user 消息提取路径上下文，注入 system（对齐 VercelAISDK 的 fileHint） */
export function buildAttachmentContextHint(messages: ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text =
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? m.content
              .filter((p): p is { type: "text"; text: string } => p?.type === "text")
              .map((p) => p.text)
              .join("\n")
          : "";
    if (!text || !PATH_BLOCK.test(text)) {
      return "当前会话未附带本地文件路径。若用户要处理 PDF/图片，请说明需先通过输入栏添加文件或文件夹，或请用户提供完整路径；不要编造路径。";
    }
    const block = text.split("---").slice(1).join("---").trim() || text;
    return `用户已在消息中提供本地路径（必须使用这些真实路径调用工具，不要编造）：
${block}

规则：
- 压缩 PDF：调用 compress_pdf，input_path 用上述路径之一；output_path 默认同目录，文件名加 _compressed（扩展名仍为 .pdf）。
- 若只有 input_path、缺少 output_path，可根据 input_path 推导 output_path 后调用工具。
- 完成工具后，用中文总结结果（含输出路径与字节变化）。`;
  }
  return "当前会话未附带本地文件路径。若用户要处理 PDF/图片，请说明需先通过输入栏添加文件或文件夹。";
}
