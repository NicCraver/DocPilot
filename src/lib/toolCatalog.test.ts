import { describe, it, expect } from "vitest";
import { TOOL_IDS } from "@docpilot/shared-types";
import { TOOL_CATALOG } from "./toolCatalog";
import { toolViews } from "../components/tools/toolViews";

function sortedSet(values: readonly string[]) {
  return [...new Set(values)].sort();
}

describe("工具 id 契约", () => {
  it("TOOL_CATALOG 的 id 集合与 TOOL_IDS 一致", () => {
    expect(sortedSet(TOOL_CATALOG.map((t) => t.id))).toEqual(sortedSet(TOOL_IDS));
  });

  it("toolViews 的 key 集合与 TOOL_IDS 一致", () => {
    expect(sortedSet(Object.keys(toolViews))).toEqual(sortedSet(TOOL_IDS));
  });
});
