import { describe, it, expect, vi } from "vitest";
import { pushAgentLog, subscribeAgentLog, formatLogTime } from "./agentLog";

describe("agentLog", () => {
  it("subscribeAgentLog 收到推送", () => {
    const fn = vi.fn();
    const off = subscribeAgentLog(fn);
    pushAgentLog({ level: "info", title: "测试" });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ level: "info", title: "测试" }));
    off();
  });

  it("formatLogTime 返回时间字符串", () => {
    expect(formatLogTime(Date.UTC(2026, 5, 4, 8, 30, 0))).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
