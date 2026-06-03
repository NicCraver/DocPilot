export type AgentAttachment =
  | { kind: "file"; path: string }
  | { kind: "files"; paths: string[] }
  | { kind: "folder"; dir: string; paths: string[] };

export function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

/** 附件展开为去重后的文件路径列表 */
export function flattenAttachmentPaths(attachments: AgentAttachment[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of attachments) {
    if (a.kind === "file") {
      if (!seen.has(a.path)) {
        seen.add(a.path);
        out.push(a.path);
      }
    } else if (a.kind === "files") {
      for (const p of a.paths) {
        if (!seen.has(p)) {
          seen.add(p);
          out.push(p);
        }
      }
    } else {
      for (const p of a.paths) {
        if (!seen.has(p)) {
          seen.add(p);
          out.push(p);
        }
      }
    }
  }
  return out;
}

/** 发给模型的 user 消息正文（含路径块） */
export function formatUserMessageForModel(text: string, attachments: AgentAttachment[]): string {
  const trimmed = text.trim();
  const body = trimmed || (attachments.length ? "请处理以下文件。" : "");
  if (!attachments.length) return body;

  const lines: string[] = [];
  for (const a of attachments) {
    if (a.kind === "file") {
      lines.push(`- ${a.path}`);
    } else if (a.kind === "files") {
      for (const p of a.paths) lines.push(`- ${p}`);
    } else if (a.paths.length) {
      for (const p of a.paths) lines.push(`- ${p}`);
      lines.push(`（来自文件夹：${a.dir}，共 ${a.paths.length} 个匹配文件）`);
    } else {
      lines.push(`（文件夹 ${a.dir} 内无匹配的 pdf/图片文件，请说明如何处理该目录）`);
    }
  }

  return `${body}\n\n---\n【用户已选本地路径】\n${lines.join("\n")}`;
}

export function attachmentChips(attachments: AgentAttachment[]): { label: string; path: string }[] {
  const chips: { label: string; path: string }[] = [];
  for (const a of attachments) {
    if (a.kind === "file") {
      chips.push({ label: basename(a.path), path: a.path });
    } else if (a.kind === "files") {
      for (const p of a.paths) chips.push({ label: basename(p), path: p });
    } else if (a.paths.length) {
      for (const p of a.paths) chips.push({ label: basename(p), path: p });
    } else {
      chips.push({ label: `文件夹: ${basename(a.dir)}`, path: a.dir });
    }
  }
  return chips;
}
