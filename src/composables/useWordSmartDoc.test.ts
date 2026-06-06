import { describe, it, expect, vi } from "vitest";

const { invokeMock, openMock, saveMock, askMock, generateSectionsMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  openMock: vi.fn(),
  saveMock: vi.fn(),
  askMock: vi.fn(),
  generateSectionsMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: openMock, save: saveMock, ask: askMock }));
vi.mock("../lib/smartDocStore", () => ({
  loadCurrentTemplateId: vi.fn().mockResolvedValue(null),
  saveCurrentTemplateId: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../agent/smartDocGenerate", () => ({ generateSections: generateSectionsMock }));

import { useWordSmartDoc } from "./useWordSmartDoc";

describe("useWordSmartDoc", () => {
  it("刷新模板列表并默认选中第一个", async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "smart_doc_list_templates")
        return Promise.resolve([
          { id: "t1", name: "模板A", description: "", section_count: 3, has_thumbnail: false },
        ]);
      if (cmd === "smart_doc_get_profile")
        return Promise.resolve({
          version: 1,
          styles: {},
          structure: [{ key: "auto_1", title: "前言", level: 1 }],
          meta_fields: [],
        });
      return Promise.resolve(undefined);
    });

    const sd = useWordSmartDoc();
    await sd.refreshTemplates();
    expect(sd.templates.value.length).toBe(1);
    expect(sd.currentId.value).toBe("t1");
    expect(sd.currentProfile.value?.structure[0].title).toBe("前言");
  });

  it("LLM 模式生成 sections 后允许生成并按 sections 调用后端", async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "smart_doc_list_templates")
        return Promise.resolve([
          { id: "t1", name: "A", description: "", section_count: 1, has_thumbnail: false },
        ]);
      if (cmd === "smart_doc_get_profile")
        return Promise.resolve({
          version: 1,
          styles: {},
          structure: [{ key: "auto_1", title: "前言", level: 1 }],
          meta_fields: [],
        });
      if (cmd === "smart_doc_generate")
        return Promise.resolve({
          results: [{ input: "(sections)", output: "/tmp/o.docx" }],
          logs: ["已生成: /tmp/o.docx"],
        });
      return Promise.resolve(undefined);
    });
    generateSectionsMock.mockResolvedValue({ auto_1: ["正文一段。"] });
    saveMock.mockResolvedValue("/tmp/o.docx");

    const sd = useWordSmartDoc();
    await sd.refreshTemplates();
    sd.contentMode.value = "llm";
    sd.topic.value = "测试主题";
    expect(sd.canGenerate.value).toBe(false);
    await sd.runLlmGenerate({ baseURL: "x", apiKey: "y", model: "m" });
    expect(sd.generatedSections.value).toEqual({ auto_1: ["正文一段。"] });
    expect(sd.canGenerate.value).toBe(true);
    await sd.generate();
    expect(invokeMock).toHaveBeenCalledWith(
      "smart_doc_generate",
      expect.objectContaining({ contentKind: "sections", sections: { auto_1: ["正文一段。"] } }),
    );
    expect(sd.lastOutputPath.value).toBe("/tmp/o.docx");
  });

  it("删除模板前使用 Tauri ask 确认，确认后再删除", async () => {
    invokeMock.mockReset();
    askMock.mockResolvedValue(true);
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "smart_doc_list_templates")
        return Promise.resolve([
          { id: "t1", name: "模板A", description: "", section_count: 1, has_thumbnail: false },
        ]);
      if (cmd === "smart_doc_delete_template") return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    const sd = useWordSmartDoc();
    await sd.refreshTemplates();
    await sd.deleteTemplateWithConfirm("t1", "模板A");

    expect(askMock).toHaveBeenCalledWith(
      "确定删除模板「模板A」？此操作不可恢复。",
      expect.objectContaining({ title: "删除模板", kind: "warning" }),
    );
    expect(invokeMock).toHaveBeenCalledWith("smart_doc_delete_template", { id: "t1" });
  });

  it("保存 profile 后同步当前 profile 与模板章节数", async () => {
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "smart_doc_list_templates")
        return Promise.resolve([
          { id: "t1", name: "模板A", description: "", section_count: 1, has_thumbnail: false },
        ]);
      if (cmd === "smart_doc_get_profile")
        return Promise.resolve({
          version: 1,
          styles: { body: { size_pt: 12 } },
          structure: [{ key: "auto_1", title: "前言", level: 1 }],
          meta_fields: [],
        });
      if (cmd === "smart_doc_update_profile") return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    const sd = useWordSmartDoc();
    await sd.refreshTemplates();
    const nextProfile = {
      version: 1,
      styles: { body: { size_pt: 14 } },
      structure: [
        { key: "auto_1", title: "前言", level: 1 },
        { key: "ui_1", title: "复盘", level: 1 },
      ],
      meta_fields: [],
    };

    await sd.updateProfile(nextProfile);

    expect(invokeMock).toHaveBeenCalledWith("smart_doc_update_profile", {
      id: "t1",
      profile: nextProfile,
    });
    expect(sd.currentProfile.value).toEqual(nextProfile);
    expect(sd.currentTemplate.value?.section_count).toBe(2);
    expect(sd.logs.value.at(-1)).toBe("模板 profile 已保存");
  });
});
