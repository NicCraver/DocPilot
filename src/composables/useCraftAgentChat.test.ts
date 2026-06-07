import { describe, expect, it } from "vitest";
import type { AgentActivity } from "../agent/activities";
import {
  CRAFT_PERMISSION_MODE_LABEL,
  CRAFT_PERMISSION_MODE_ORDER,
  deriveCraftTurnPhase,
  mapAgentActivityToCraft,
  messagesToCraftTurns,
  shouldShowCraftThinkingIndicator,
} from "./useCraftAgentChat";

describe("useCraftAgentChat adapter", () => {
  it("maps agent activities into Craft activity rows", () => {
    const activity: AgentActivity = {
      id: "a1",
      kind: "tool",
      status: "success",
      title: "已完成：PDF 压缩",
      toolName: "compress_pdf",
      args: {
        input_path: "/tmp/input.pdf",
        output_path: "/tmp/input_compressed.pdf",
      },
      result: { message: "压缩完成" },
    };

    expect(mapAgentActivityToCraft(activity)).toMatchObject({
      id: "a1",
      kind: "tool",
      status: "success",
      title: "PDF 压缩",
      description: "已完成：PDF 压缩",
      fileName: "input.pdf",
      output: "压缩完成",
    });
  });

  it("derives Craft turn phases from activity and stream state", () => {
    expect(
      deriveCraftTurnPhase({
        activities: [],
        response: "",
        streaming: true,
        complete: false,
      }),
    ).toBe("pending");

    expect(
      deriveCraftTurnPhase({
        activities: [{ kind: "tool", status: "running" }],
        response: "",
        streaming: true,
        complete: false,
      }),
    ).toBe("tool_active");

    expect(
      deriveCraftTurnPhase({
        activities: [{ kind: "tool", status: "success" }],
        response: "",
        streaming: true,
        complete: false,
      }),
    ).toBe("awaiting");

    expect(
      deriveCraftTurnPhase({
        activities: [{ kind: "tool", status: "success" }],
        response: "好了",
        streaming: true,
        complete: false,
      }),
    ).toBe("streaming");

    expect(
      deriveCraftTurnPhase({
        activities: [{ kind: "tool", status: "success" }],
        response: "好了",
        streaming: false,
        complete: true,
      }),
    ).toBe("complete");
  });

  it("keeps the thinking indicator visible during hidden active gaps", () => {
    expect(shouldShowCraftThinkingIndicator("pending", false)).toBe(true);
    expect(shouldShowCraftThinkingIndicator("awaiting", false)).toBe(true);
    expect(shouldShowCraftThinkingIndicator("streaming", true)).toBe(true);
    expect(shouldShowCraftThinkingIndicator("streaming", false)).toBe(false);
    expect(shouldShowCraftThinkingIndicator("tool_active", false)).toBe(false);
    expect(shouldShowCraftThinkingIndicator("complete", false)).toBe(false);
  });

  it("maps messages into visible Craft turn state", () => {
    const turns = messagesToCraftTurns(
      [
        { role: "user", content: "压缩 PDF" },
        {
          role: "assistant",
          content: "",
          draftContent: "",
          activities: [
            {
              id: "prepare",
              kind: "prepare",
              status: "success",
              title: "已就绪",
            },
          ],
        },
      ],
      true,
    );

    const assistant = turns[1];
    expect(assistant?.type).toBe("assistant");
    if (!assistant || assistant.type !== "assistant") {
      throw new Error("expected assistant turn");
    }
    expect(assistant.phase).toBe("awaiting");
    expect(assistant.showThinkingIndicator).toBe(true);
    expect(assistant.complete).toBe(false);
  });

  it("uses Craft permission labels and Shift+Tab order", () => {
    expect(CRAFT_PERMISSION_MODE_ORDER).toEqual(["safe", "ask", "auto"]);
    expect(CRAFT_PERMISSION_MODE_LABEL).toEqual({
      safe: "Explore",
      ask: "Ask",
      auto: "Execute",
    });
  });
});
