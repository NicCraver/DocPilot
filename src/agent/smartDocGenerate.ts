import { generateText } from "ai";
import { createChatModel } from "./providers";
import type { ProviderSettings } from "../composables/useProviderSettings";
import type { SmartDocSection } from "../lib/smartDocTypes";

export interface GenerateSectionsParams {
  topic: string;
  hints: string;
  structure: SmartDocSection[];
  settings: ProviderSettings;
}

function buildPrompt(topic: string, hints: string, structure: SmartDocSection[]): string {
  const outline = structure.map((s) => `- key=${s.key}（层级${s.level}）：${s.title}`).join("\n");
  return [
    "你是一名专业的中文公文/报告撰写助手。",
    "请根据给定主题与要点，按下方章节结构逐节撰写正文内容。",
    "",
    `主题：${topic}`,
    hints.trim() ? `要点提示：${hints.trim()}` : "",
    "",
    "章节结构：",
    outline,
    "",
    "输出要求：",
    "1. 只输出一个 JSON 对象，键为上面的 key，值为该章节的段落字符串数组。",
    "2. 每个章节 1-4 个自然段，内容具体、通顺、符合中文写作习惯。",
    "3. 不要输出 Markdown 代码块标记，不要输出额外解释。",
    '示例：{"auto_1":["第一段……","第二段……"],"auto_2":["……"]}',
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJson(text: string): Record<string, string[]> {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (Array.isArray(v)) {
      out[k] = v.map((x) => String(x)).filter((x) => x.trim());
    } else if (typeof v === "string" && v.trim()) {
      out[k] = [v.trim()];
    }
  }
  return out;
}

export async function generateSections(
  params: GenerateSectionsParams,
): Promise<Record<string, string[]>> {
  const { topic, hints, structure, settings } = params;
  if (!topic.trim()) throw new Error("请输入文档主题");
  if (!structure.length) throw new Error("当前模板没有可生成的章节结构");
  const model = createChatModel(settings);
  const { text } = await generateText({
    model,
    prompt: buildPrompt(topic, hints, structure),
  });
  try {
    const sections = extractJson(text);
    if (!Object.keys(sections).length) {
      throw new Error("模型未返回有效章节内容");
    }
    return sections;
  } catch (e) {
    throw new Error(`解析模型输出失败：${String(e)}`);
  }
}
