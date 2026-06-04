import { streamText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { pushAgentLog } from "./agentLog";
import { buildAttachmentContextHint } from "./contextHint";
import { createChatModel } from "./providers";
import { lastUserTextFromMessages, selectToolsForUserText } from "./toolSelect";
import type { ProviderSettings } from "../composables/useProviderSettings";

const SYSTEM_PROMPT = `你是 DocPilot 智能助手，通过已注册工具完成用户的 PDF/图片/文件处理请求。

工作方式（参考 Vercel AI SDK Agent 编排）：
1. 阅读会话中的路径提示；有路径时必须先调用合适工具，不要只口头承诺。
2. 用户要求压缩 PDF 时，调用 compress_pdf：使用消息中的 input_path；output_path 默认同目录、文件名加 _compressed。
3. 工具执行成功后，用中文简洁总结：做了什么、输出路径、体积/页数等关键数据。
4. 缺少路径时，明确提示用户在输入栏添加文件/文件夹或提供完整路径；不要编造路径或假装已执行。
5. 回答使用 Markdown 列表呈现关键数据。`;

export interface ToolCallRecord {
  toolName: string;
  args: unknown;
  result?: unknown;
  error?: string;
}

export interface RunAgentOptions {
  messages: ModelMessage[];
  tools: ToolSet;
  settings: ProviderSettings;
  onTextDelta?: (text: string) => void;
  onToolCall?: (record: ToolCallRecord) => void;
}

export async function runAgentChat(options: RunAgentOptions): Promise<string> {
  const { messages, tools, settings, onTextDelta, onToolCall } = options;

  const userText = lastUserTextFromMessages(messages);
  const activeTools = selectToolsForUserText(tools, userText);
  const fileHint = buildAttachmentContextHint(messages);

  let stepNo = 0;
  let streamLogged = false;

  const result = streamText({
    model: createChatModel(settings),
    system: `${SYSTEM_PROMPT}\n\n${fileHint}\n模型：${settings.model}`,
    messages,
    tools: activeTools,
    stopWhen: stepCountIs(8),
    onStepFinish: ({ toolCalls, toolResults, text, finishReason }) => {
      stepNo += 1;
      if (toolCalls.length) {
        const names = toolCalls.map((c) => c.toolName).join("、");
        pushAgentLog({
          level: "step",
          title: `模型步骤 #${stepNo}：调用工具`,
          detail: `${names} · ${finishReason ?? ""}`,
        });
      } else if (text?.trim()) {
        pushAgentLog({
          level: "step",
          title: `模型步骤 #${stepNo}：生成文本`,
          detail: text.length > 120 ? `${text.slice(0, 120)}…` : text,
        });
      } else {
        pushAgentLog({
          level: "warn",
          title: `模型步骤 #${stepNo}：无文本无工具`,
          detail: String(finishReason ?? "unknown"),
        });
      }
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
  const streamTask = (async () => {
    for await (const chunk of result.textStream) {
      if (!streamLogged) {
        streamLogged = true;
        pushAgentLog({ level: "info", title: "模型开始流式输出回复" });
      }
      fullText += chunk;
      onTextDelta?.(fullText);
    }
  })();

  try {
    await result.consumeStream();
  } catch (e) {
    pushAgentLog({ level: "error", title: "模型流消费失败", detail: String(e) });
    throw e;
  }

  await streamTask;

  const finalText = await result.text;
  if (finalText && finalText.length > fullText.length) {
    fullText = finalText;
    onTextDelta?.(fullText);
  }

  const finishReason = await result.finishReason;
  const steps = await result.steps;
  pushAgentLog({
    level: "success",
    title: "模型回复完成",
    detail: [
      fullText ? `${fullText.length} 字符` : "无文本",
      `finish=${finishReason ?? "?"}`,
      `steps=${steps.length}`,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  if (!fullText.trim() && steps.every((s) => !s.toolCalls?.length)) {
    return "模型未返回内容，也未调用工具。请确认 API 使用 Chat Completions（智谱/Ollama 等需 provider.chat），并已添加 PDF 附件或提供完整路径。";
  }

  return fullText;
}
