import { describe, expect, it, vi } from "vitest";

const { loadCacheMock, updateCacheMock } = vi.hoisted(() => ({
  loadCacheMock: vi.fn(),
  updateCacheMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock("../lib/wordTypesetStore", () => ({
  loadWordTypesetCache: loadCacheMock,
  updateWordTypesetCache: updateCacheMock,
}));

import { useWordTypeset } from "./useWordTypeset";
import {
  governmentWordTypesetConfig,
  journalWordTypesetConfig,
  thesisWordTypesetConfig,
} from "../lib/wordTypesetConfig";

describe("useWordTypeset", () => {
  it("切换预设时可以持久化当前响应式配置快照", async () => {
    loadCacheMock.mockResolvedValue({
      activePresetId: "government",
      presets: {
        government: governmentWordTypesetConfig(),
        thesis: thesisWordTypesetConfig(),
        journal: journalWordTypesetConfig(),
      },
    });
    updateCacheMock.mockResolvedValue(undefined);

    const wt = useWordTypeset();
    wt.config.value.headings.title_font = "宋体";

    await expect(wt.switchPreset("thesis")).resolves.toBeUndefined();
    expect(updateCacheMock).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "government",
        presetConfig: expect.objectContaining({
          headings: expect.objectContaining({ title_font: "宋体" }),
        }),
      }),
    );
  });
});
