import { describe, expect, it, vi } from "vitest";
import { useAgentLog } from "./useAgentLog";

describe("useAgentLog", () => {
  it("允许在组件 setup 外创建日志订阅且不触发 Vue 生命周期警告", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    useAgentLog();

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("onUnmounted is called when there is no active component instance"),
    );
    warnSpy.mockRestore();
  });
});
