import type { ToolSet } from "ai";
import { pushAgentLog } from "./agentLog";

/** 按用户意图缩小工具集，避免 20+ 工具淹没小模型 */
const INTENT_RULES: { pattern: RegExp; toolIds: string[] }[] = [
  {
    pattern: /压缩|compress|缩小|体积/i,
    toolIds: ["compress_pdf", "get_pdf_info"],
  },
  {
    pattern: /合并|merge/i,
    toolIds: ["merge_pdf", "get_pdf_info"],
  },
  {
    pattern: /拆分|分割|split/i,
    toolIds: ["split_pdf", "get_pdf_info"],
  },
  {
    pattern: /旋转|rotate/i,
    toolIds: ["rotate_pdf", "get_pdf_info"],
  },
  {
    pattern: /图片.*pdf|图转pdf|images?\s*to\s*pdf/i,
    toolIds: ["images_to_pdf", "get_image_info"],
  },
  {
    pattern: /压缩.*图|图片.*压缩/i,
    toolIds: ["compress_image", "get_image_info"],
  },
  {
    pattern: /排版|格式(化|调整)|typeset|统一.*样式/i,
    toolIds: ["format_docx_batch", "format_docx_text", "get_file_info"],
  },
  {
    pattern: /markdown|转\s*md|\.md\b|pptx|xlsx|markitdown/i,
    toolIds: ["convert_to_markdown", "get_file_info"],
  },
  {
    pattern: /word|docx/i,
    toolIds: ["format_docx_batch", "convert_to_markdown", "get_file_info"],
  },
];

export function selectToolsForUserText(allTools: ToolSet, userText: string): ToolSet {
  const text = userText.trim();
  if (!text) return allTools;

  for (const rule of INTENT_RULES) {
    if (!rule.pattern.test(text)) continue;
    const picked: ToolSet = {};
    for (const id of rule.toolIds) {
      if (allTools[id]) picked[id] = allTools[id];
    }
    if (Object.keys(picked).length > 0) {
      pushAgentLog({
        level: "info",
        title: "已按意图筛选工具",
        detail: Object.keys(picked).join("、"),
      });
      return picked;
    }
  }
  return allTools;
}

export function lastUserTextFromMessages(messages: { role: string; content: unknown }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      return m.content
        .filter((p): p is { type: "text"; text: string } => p?.type === "text")
        .map((p) => p.text)
        .join("\n");
    }
  }
  return "";
}
