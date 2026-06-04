export type AgentActivityStatus = "running" | "success" | "error";

export type AgentActivityKind = "prepare" | "file" | "tool" | "draft";

export interface AgentActivity {
  id: string;
  kind: AgentActivityKind;
  status: AgentActivityStatus;
  title: string;
  detail?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
  error?: string;
}

const TOOL_LABELS: Record<string, string> = {
  compress_pdf: "PDF 压缩",
  merge_pdf: "PDF 合并",
  split_pdf: "PDF 拆分",
  get_pdf_info: "读取 PDF 信息",
  rotate_pdf: "旋转 PDF",
  extract_pages: "提取页面",
  delete_pages: "删除页面",
  reorder_pages: "重排页面",
  add_blank_pages: "添加空白页",
  duplicate_page: "复制页面",
  get_image_info: "读取图片信息",
  compress_image: "压缩图片",
  resize_image: "调整图片尺寸",
  convert_image: "转换图片格式",
  crop_image: "裁剪图片",
  rotate_image: "旋转图片",
  merge_images: "合并图片",
  images_to_pdf: "图片转 PDF",
  get_file_info: "读取文件信息",
  compute_hash: "计算哈希",
  copy_file: "复制文件",
  move_file: "移动文件",
  text_to_pdf: "文本转 PDF",
};

export function toolFriendlyName(toolId: string): string {
  return TOOL_LABELS[toolId] ?? toolId;
}

export function createActivityId(): string {
  return crypto.randomUUID();
}

export function formatActivityResult(result: unknown): string | undefined {
  if (result == null) return undefined;
  if (typeof result === "string") return result;
  if (typeof result === "object") {
    const r = result as { message?: string; data?: unknown };
    if (r.message) return r.message;
    try {
      return JSON.stringify(r.data ?? result, null, 2);
    } catch {
      return String(result);
    }
  }
  return String(result);
}

export function formatActivityArgs(args: unknown): string | undefined {
  if (args == null) return undefined;
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}
