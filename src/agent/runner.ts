import { streamText, isStepCount, type CoreMessage, type ToolSet } from "ai";
import { createChatModel } from "./providers";
import type { ProviderSettings } from "../composables/useProviderSettings";

const SYSTEM_PROMPT = `你是 DocPilot 智能助手，帮助用户完成文件处理任务。
你可以调用已注册的工具（如 PDF 压缩）。执行工具时请使用用户提供的真实文件路径。
若缺少路径等信息，请向用户询问。用中文简洁回复。`;

export interface ToolCallRecord {
  toolName: string;
  args: unknown;
  result?: unknown;
  error?: string;
}

export interface RunAgentOptions {
  messages: CoreMessage[];
  tools: ToolSet;
  settings: ProviderSettings;
  onTextDelta?: (text: string) => void;
  onToolCall?: (record: ToolCallRecord) => void;
}

export async function runAgentChat(options: RunAgentOptions): Promise<string> {
  const { messages, tools, settings, onTextDelta, onToolCall } = options;

  const result = streamText({
    model: createChatModel(settings),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: isStepCount(5),
    onStepFinish: ({ toolCalls, toolResults }) => {
      for (let i = 0; i < toolCalls.length; i++) {
        const call = toolCalls[i];
        const tr = toolResults[i];
        onToolCall?.({
          toolName: call.toolName,
          args: call.input,
          result: tr?.output,
          error: tr?.error ? String(tr.error) : undefined,
        });
      }
    },
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
    onTextDelta?.(fullText);
  }
  return fullText;
}
