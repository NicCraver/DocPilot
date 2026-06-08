import { computed, ref } from "vue";
import {
  deriveCraftTurnPhase,
  shouldShowCraftThinkingIndicator,
  type CraftActivity,
  type CraftAssistantTurn,
  type CraftTurn,
  type CraftUserTurn,
} from "./useCraftAgentChat";

export type CraftOssTodoState = "backlog" | "todo" | "needs-review" | "done" | "cancelled";
export type CraftOssPermissionMode = "safe" | "ask" | "allow-all";

/** OSS PERMISSION_MODE_CONFIG displayName / shortName */
export const CRAFT_OSS_PERMISSION_LABEL: Record<CraftOssPermissionMode, string> = {
  safe: "Explore",
  ask: "Ask to Edit",
  "allow-all": "Auto",
};

export const CRAFT_OSS_PERMISSION_SHORT: Record<CraftOssPermissionMode, string> = {
  safe: "Explore",
  ask: "Ask",
  "allow-all": "Auto",
};

export const CRAFT_OSS_PERMISSION_ORDER: CraftOssPermissionMode[] = ["safe", "ask", "allow-all"];

export const CRAFT_OSS_TODO_STATES: Array<{
  id: CraftOssTodoState;
  label: string;
  colorClass: string;
  icon: string;
  category: "open" | "closed";
}> = [
  {
    id: "backlog",
    label: "Backlog",
    colorClass: "is-muted",
    icon: "i-lucide-inbox",
    category: "open",
  },
  { id: "todo", label: "Todo", colorClass: "is-muted", icon: "i-lucide-circle", category: "open" },
  {
    id: "needs-review",
    label: "Needs Review",
    colorClass: "is-info",
    icon: "i-lucide-eye",
    category: "open",
  },
  {
    id: "done",
    label: "Done",
    colorClass: "is-accent",
    icon: "i-lucide-check",
    category: "closed",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    colorClass: "is-muted",
    icon: "i-lucide-ban",
    category: "closed",
  },
];

export interface CraftOssPendingPermission {
  toolId: string;
  toolLabel: string;
  summary: string;
  argsPreview: string;
}

export type CraftOssDemoState =
  | "empty"
  | "thinking"
  | "awaiting"
  | "streaming"
  | "permission"
  | "stopped"
  | "plan"
  | "completed"
  | "error"
  | "multi-turn"
  | "flagged"
  | "long-tools"
  | "backlog"
  | "cancelled";

export interface CraftOssSession {
  id: string;
  name: string;
  preview: string;
  todoState: CraftOssTodoState;
  permissionMode: CraftOssPermissionMode;
  demoState: CraftOssDemoState;
  demoLabel: string;
  isFlagged?: boolean;
  isProcessing?: boolean;
  isUnread?: boolean;
  lastMessageRole?: "user" | "assistant" | "plan";
  lastMessageAt: number;
  dateGroup: "Today" | "Yesterday" | string;
  turns: CraftTurn[];
  pendingPermission?: CraftOssPendingPermission;
  notes?: string;
  files?: string[];
  model?: string;
}

/** 左侧导航 / 空状态快速跳转用 */
export const CRAFT_OSS_DEMO_CATALOG: Array<{
  sessionId: string;
  state: CraftOssDemoState;
  label: string;
  hint: string;
}> = [
  { sessionId: "new-session", state: "empty", label: "空会话", hint: "无消息，可发送触发模拟" },
  {
    sessionId: "demo-thinking",
    state: "thinking",
    label: "Thinking",
    hint: "首轮思考，尚无工具步骤",
  },
  {
    sessionId: "demo-awaiting",
    state: "awaiting",
    label: "Preparing",
    hint: "工具已完成，等待生成 Response",
  },
  {
    sessionId: "demo-streaming",
    state: "streaming",
    label: "Streaming",
    hint: "工具执行中 + Response 流式输出",
  },
  {
    sessionId: "permission-demo",
    state: "permission",
    label: "权限确认",
    hint: "Ask 模式结构化工具批准 UI",
  },
  {
    sessionId: "demo-stopped",
    state: "stopped",
    label: "已中断",
    hint: "用户 Stop 后的 Stopped 状态",
  },
  {
    sessionId: "api-integration",
    state: "plan",
    label: "计划审阅",
    hint: "Plan Response + Accept Plan",
  },
  {
    sessionId: "q4-report",
    state: "completed",
    label: "已完成",
    hint: "Done · 完整工具链 + 定稿回复",
  },
  {
    sessionId: "failed-deploy",
    state: "error",
    label: "工具报错",
    hint: "Activity error + 诊断回复",
  },
  {
    sessionId: "demo-multi",
    state: "multi-turn",
    label: "多轮对话",
    hint: "两轮 user/assistant 往返",
  },
  {
    sessionId: "demo-flagged",
    state: "flagged",
    label: "Flagged",
    hint: "星标 + New 徽章 + 处理中",
  },
  {
    sessionId: "demo-long",
    state: "long-tools",
    label: "长工具链",
    hint: "10+ 步骤，可展开收起",
  },
  { sessionId: "demo-backlog", state: "backlog", label: "Backlog", hint: "Backlog 工作流状态" },
  { sessionId: "demo-cancelled", state: "cancelled", label: "Cancelled", hint: "已取消的归档会话" },
];

function assistantTurn(input: {
  id: string;
  title: string;
  activities: CraftActivity[];
  response: string;
  time: string;
  streaming?: boolean;
  complete?: boolean;
  interrupted?: boolean;
}): CraftAssistantTurn {
  const streaming = input.streaming ?? false;
  const complete = input.complete ?? true;
  const phase = deriveCraftTurnPhase({
    activities: input.activities,
    response: input.response,
    streaming,
    complete,
  });
  const isBuffering = streaming && input.response.trim().length === 0;
  return {
    id: input.id,
    type: "assistant",
    title: input.title,
    activities: input.activities,
    response: input.response,
    time: input.time,
    streaming,
    complete,
    interrupted: input.interrupted ?? false,
    phase,
    showThinkingIndicator: shouldShowCraftThinkingIndicator(phase, isBuffering),
    expanded: true,
  };
}

function userTurn(
  id: string,
  content: string,
  time: string,
  attachments?: string[],
): CraftUserTurn {
  return { id, type: "user", content, time, attachments };
}

function activity(
  id: string,
  toolName: string,
  status: CraftActivity["status"],
  title: string,
  extra?: Partial<CraftActivity>,
): CraftActivity {
  return {
    id,
    kind: "tool",
    toolName,
    status,
    title,
    description: extra?.description ?? title,
    input: extra?.input,
    output: extra?.output,
    fileName: extra?.fileName,
    elapsed: extra?.elapsed,
  };
}

class SimulationAborted extends Error {
  name = "SimulationAborted";
}

function formatNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function truncate(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function buildMockResponse(userMessage: string) {
  const excerpt = truncate(userMessage, 120);
  return `## Response

I've processed your request:

> ${excerpt}

### What I did

1. Analyzed the workspace context and relevant files
2. Ran the necessary tools to gather information
3. Prepared the output below

### Result

The task completed successfully. You can review the changes in the inspector panel or ask a follow-up question to refine the result.`;
}

const SIMULATION_STEPS: Array<{
  id: string;
  toolName: string;
  title: string;
  description: string;
  runMs: number;
  fileName?: string;
}> = [
  {
    id: "sim-think",
    toolName: "think",
    title: "Analyze request",
    description: "Understanding context and intent",
    runMs: 900,
  },
  {
    id: "sim-read",
    toolName: "read_file",
    title: "Read workspace files",
    description: "Scan project structure",
    runMs: 1100,
    fileName: "README.md",
  },
  {
    id: "sim-act",
    toolName: "edit_file",
    title: "Apply changes",
    description: "Update target output",
    runMs: 1300,
    fileName: "output.md",
  },
];

function buildLongActivities(count: number): CraftActivity[] {
  const names = [
    "List repository files",
    "Read package.json",
    "Read tsconfig.json",
    "Search imports",
    "Analyze dependencies",
    "Read src/App.vue",
    "Read composables",
    "Grep TODO markers",
    "Read FEATURE.md",
    "Summarize findings",
    "Draft refactor plan",
    "Write changelog entry",
  ];
  return Array.from({ length: count }, (_, i) =>
    activity(`long-${i + 1}`, "read_file", "success", names[i] ?? `Step ${i + 1}`, {
      description: `Batch step ${i + 1}`,
      elapsed: `${(0.2 + i * 0.1).toFixed(1)}s`,
      fileName: `file-${i + 1}.ts`,
    }),
  );
}

const MOCK_SESSIONS: CraftOssSession[] = [
  {
    id: "new-session",
    name: "New Chat",
    preview: "Start a conversation",
    todoState: "todo",
    permissionMode: "ask",
    demoState: "empty",
    demoLabel: "空会话",
    lastMessageAt: Date.now(),
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [],
  },
  {
    id: "demo-thinking",
    name: "Research competitor docs",
    preview: "Thinking…",
    todoState: "todo",
    permissionMode: "safe",
    demoState: "thinking",
    demoLabel: "Thinking",
    isProcessing: true,
    lastMessageAt: Date.now() - 30_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "Summarize the latest Craft Agents release notes.", "11:20"),
      assistantTurn({
        id: "a1",
        title: "Thinking",
        time: "11:20",
        activities: [],
        response: "",
        streaming: false,
        complete: false,
      }),
    ],
  },
  {
    id: "demo-awaiting",
    name: "Refactor auth module",
    preview: "Preparing response…",
    todoState: "todo",
    permissionMode: "ask",
    demoState: "awaiting",
    demoLabel: "Preparing response",
    isProcessing: true,
    lastMessageAt: Date.now() - 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "Refactor the auth module to use a single token store.", "11:15"),
      assistantTurn({
        id: "a1",
        title: "Refactor auth module",
        time: "11:15",
        complete: false,
        activities: [
          activity("t1", "think", "success", "Analyze auth flow", { elapsed: "1.1s" }),
          activity("t2", "read_file", "success", "Read auth store", {
            fileName: "auth.ts",
            elapsed: "0.4s",
          }),
          activity("t3", "grep", "success", "Find token usages", { elapsed: "0.6s" }),
        ],
        response: "",
      }),
    ],
  },
  {
    id: "demo-streaming",
    name: "GitHub PR 同步",
    preview: "正在写入 CHANGELOG…",
    todoState: "todo",
    permissionMode: "ask",
    demoState: "streaming",
    demoLabel: "Streaming",
    isProcessing: true,
    lastMessageAt: Date.now() - 8 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    files: ["CHANGELOG.md"],
    turns: [
      userTurn("u1", "Sync open PRs from craft-agents-oss into CHANGELOG.", "10:41"),
      assistantTurn({
        id: "a1",
        title: "Sync GitHub pull requests",
        time: "10:41",
        streaming: true,
        complete: false,
        activities: [
          activity("t1", "github_list_prs", "success", "List open pull requests", {
            description: "craft-ai-agents/craft-agents-oss",
            elapsed: "1.2s",
          }),
          activity("t2", "read_file", "success", "Read CHANGELOG.md", {
            fileName: "CHANGELOG.md",
            elapsed: "0.3s",
          }),
          activity("t3", "edit_file", "running", "Update changelog entries", {
            description: "Append PR #128, #131",
            fileName: "CHANGELOG.md",
          }),
        ],
        response:
          "Collected 4 open PRs. Appending entries for UI parity, mock sessions, and streaming fixes…",
      }),
    ],
  },
  {
    id: "permission-demo",
    name: "批量压缩图片",
    preview: "等待确认：compress_image",
    todoState: "todo",
    permissionMode: "ask",
    demoState: "permission",
    demoLabel: "权限确认",
    lastMessageAt: Date.now() - 2 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    pendingPermission: {
      toolId: "compress_image",
      toolLabel: "Compress Image",
      summary: "将 screenshots/ 下 12 张 PNG 压缩到 80% 质量",
      argsPreview: JSON.stringify(
        { input_dir: "/Users/demo/screenshots", quality: 80, format: "webp" },
        null,
        2,
      ),
    },
    turns: [
      userTurn("u1", "Compress all PNG files in screenshots/ and convert to WebP.", "10:58"),
      assistantTurn({
        id: "a1",
        title: "Prepare image compression",
        time: "10:58",
        complete: false,
        activities: [
          activity("t1", "list_files", "success", "List folder contents", {
            description: "screenshots/",
            elapsed: "0.2s",
          }),
          activity("t2", "compress_image", "pending", "Compress images", {
            description: "Awaiting permission",
            fileName: "12 files",
          }),
        ],
        response: "",
      }),
    ],
  },
  {
    id: "demo-stopped",
    name: "Generate API docs",
    preview: "Stopped",
    todoState: "todo",
    permissionMode: "allow-all",
    demoState: "stopped",
    demoLabel: "已中断",
    lastMessageAt: Date.now() - 5 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "Generate OpenAPI docs for all Tauri commands.", "10:50"),
      assistantTurn({
        id: "a1",
        title: "Generate API docs",
        time: "10:50",
        interrupted: true,
        complete: true,
        activities: [
          activity("t1", "read_file", "success", "Read commands.rs", {
            fileName: "commands.rs",
            elapsed: "0.5s",
          }),
          activity("t2", "grep", "success", "Find command handlers", { elapsed: "0.3s" }),
        ],
        response: `## Partial output

I started mapping invoke handlers under \`src-tauri/src/commands.rs\`.

### Found so far

- \`list_tools\`
- \`run_tool\`
- \`format_docx_batch\`

_Generation was stopped before completing the OpenAPI spec._`,
      }),
    ],
  },
  {
    id: "api-integration",
    name: "Slack 通知集成",
    preview: "计划：Webhook + 重试策略",
    todoState: "needs-review",
    permissionMode: "allow-all",
    demoState: "plan",
    demoLabel: "计划审阅",
    isUnread: true,
    lastMessageRole: "plan",
    lastMessageAt: Date.now() - 3 * 60 * 60_000,
    dateGroup: "Today",
    model: "claude-opus-4-20250514",
    notes: "需要安全评审后再合并。",
    turns: [
      userTurn("u1", "Design Slack notifications for tool completion events with retry.", "07:20"),
      assistantTurn({
        id: "a1",
        title: "Design Slack notification flow",
        time: "07:21",
        activities: [
          activity("t1", "think", "success", "Analyze event sources", {
            description: "Map tool completion hooks",
            elapsed: "3.4s",
          }),
          activity("t2", "write_plan", "success", "Draft implementation plan", {
            description: "Webhook + queue + retry",
            elapsed: "1.1s",
          }),
        ],
        response: `## Implementation Plan

1. **Event bus** — emit \`tool.run.completed\` when a turn finishes.
2. **Slack webhook** — payload includes session, tool name, duration.
3. **Retry queue** — exponential backoff, max 5 attempts.
4. **Permissions** — writes still require approval in Ask mode.

> Review and choose **Accept Plan** or **Accept & Compact**.`,
      }),
    ],
  },
  {
    id: "q4-report",
    name: "Q4 报告 PDF 整理",
    preview: "已合并 3 份 PDF 并生成摘要",
    todoState: "done",
    permissionMode: "safe",
    demoState: "completed",
    demoLabel: "已完成",
    lastMessageAt: Date.now() - 45 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    notes: "客户交付用，保留原始页码。",
    files: ["Q4-summary.pdf", "appendix-a.pdf"],
    turns: [
      userTurn("u1", "把这三份季度报告 PDF 合并，并生成一页执行摘要。", "09:12"),
      assistantTurn({
        id: "a1",
        title: "合并 PDF 并撰写摘要",
        time: "09:13",
        activities: [
          activity("t1", "get_pdf_info", "success", "Read PDF metadata", {
            description: "Inspect source documents",
            fileName: "q1-report.pdf",
            elapsed: "0.4s",
          }),
          activity("t2", "merge_pdf", "success", "Merge PDF files", {
            description: "Combine 3 documents",
            fileName: "Q4-combined.pdf",
            elapsed: "1.8s",
          }),
          activity("t3", "prepare_response", "success", "Draft executive summary", {
            description: "Synthesize key metrics",
            elapsed: "2.1s",
          }),
        ],
        response: `## 执行摘要

- **营收**：同比增长 18%，主要来自企业客户续约。
- **毛利率**：提升至 62%，Sidecar 打包降低了支持成本。
- **风险**：两项大客户合同将于 Q1 到期，需提前 60 天启动续约。

合并后的文件已保存为 \`Q4-combined.pdf\`，摘要见上文。`,
      }),
    ],
  },
  {
    id: "failed-deploy",
    name: "DMG 打包失败排查",
    preview: "codesign 步骤报错",
    todoState: "needs-review",
    permissionMode: "safe",
    demoState: "error",
    demoLabel: "工具报错",
    lastMessageAt: Date.now() - 26 * 60 * 60_000,
    dateGroup: "Yesterday",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "分析昨晚 DMG 打包日志，定位 codesign 失败原因。", "昨天 18:02"),
      assistantTurn({
        id: "a1",
        title: "Investigate codesign failure",
        time: "昨天 18:03",
        activities: [
          activity("t1", "read_file", "success", "Read build log", {
            fileName: "tauri-build.log",
            elapsed: "0.5s",
          }),
          activity("t2", "bash", "error", "Verify signing identity", {
            description: "security find-identity -v -p codesigning",
            output: "Error: No valid signing certificate found",
            elapsed: "0.2s",
          }),
        ],
        response: `## 结论

构建日志显示 **codesign** 阶段失败：本机 Keychain 中无有效的 Developer ID Application 证书。

### 建议

1. 在 Xcode → Settings → Accounts 下载证书；
2. 或设置 \`APPLE_SIGNING_IDENTITY\` 为 ad-hoc 仅用于本地测试。`,
      }),
    ],
  },
  {
    id: "demo-multi",
    name: "Word 模板调试",
    preview: "第二轮：修复页眉页脚",
    todoState: "todo",
    permissionMode: "ask",
    demoState: "multi-turn",
    demoLabel: "多轮对话",
    lastMessageAt: Date.now() - 12 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "Check why the Word template fill leaves empty headers.", "10:10"),
      assistantTurn({
        id: "a1",
        title: "Diagnose template headers",
        time: "10:11",
        activities: [
          activity("m1", "read_file", "success", "Read template XML", {
            fileName: "template.docx",
            elapsed: "0.4s",
          }),
        ],
        response:
          "The header placeholders are named `{{header_title}}` but the content file uses `{{title}}`. Rename or align the keys.",
      }),
      userTurn("u2", "Fix the placeholder names and regenerate the sample doc.", "10:18"),
      assistantTurn({
        id: "a2",
        title: "Fix placeholders",
        time: "10:19",
        activities: [
          activity("m2", "edit_file", "success", "Update placeholder map", { elapsed: "0.8s" }),
          activity("m3", "run_tool", "success", "Generate sample Word", { elapsed: "2.4s" }),
        ],
        response:
          "Updated the mapping and generated `sample-output.docx`. Headers now render correctly.",
      }),
    ],
  },
  {
    id: "demo-flagged",
    name: "Craft 文档导出",
    preview: "Exporting to Markdown…",
    todoState: "todo",
    permissionMode: "ask",
    demoState: "flagged",
    demoLabel: "Flagged + Unread",
    isFlagged: true,
    isUnread: true,
    isProcessing: true,
    lastMessageAt: Date.now() - 20 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "Export Craft doc「Product Review 0606」to Markdown.", "10:05", [
        "Product Review 0606.craftdoc",
      ]),
      assistantTurn({
        id: "a1",
        title: "Export Craft document",
        time: "10:05",
        streaming: true,
        complete: false,
        activities: [
          activity("t1", "craft_search", "success", "Search workspace", {
            description: "Find document by title",
            elapsed: "0.9s",
          }),
          activity("t2", "craft_export", "running", "Export to Markdown", {
            description: "Convert blocks to GFM",
            fileName: "product-review-0606.md",
          }),
        ],
        response: "",
      }),
    ],
  },
  {
    id: "demo-long",
    name: "Monorepo 结构梳理",
    preview: "12 steps completed",
    todoState: "needs-review",
    permissionMode: "safe",
    demoState: "long-tools",
    demoLabel: "长工具链",
    lastMessageAt: Date.now() - 90 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "Map the entire monorepo and list refactor opportunities.", "09:00"),
      assistantTurn({
        id: "a1",
        title: "Map monorepo structure",
        time: "09:02",
        activities: buildLongActivities(12),
        response: `## Monorepo overview

Scanned 12 packages/apps. Main opportunities:

- Consolidate shared types under \`packages/shared-types\`
- Extract agent UI adapters into \`composables/\`
- Add virtual scrolling for long Craft timelines`,
      }),
    ],
  },
  {
    id: "demo-backlog",
    name: "Landing page copy",
    preview: "Waiting in backlog",
    todoState: "backlog",
    permissionMode: "safe",
    demoState: "backlog",
    demoLabel: "Backlog",
    lastMessageAt: Date.now() - 2 * 60 * 60_000,
    dateGroup: "Today",
    model: "claude-sonnet-4-20250514",
    turns: [userTurn("u1", "Draft marketing copy for the Craft Agents OSS launch page.", "08:30")],
  },
  {
    id: "demo-cancelled",
    name: "Old migration plan",
    preview: "Cancelled",
    todoState: "cancelled",
    permissionMode: "ask",
    demoState: "cancelled",
    demoLabel: "Cancelled",
    lastMessageAt: Date.now() - 40 * 60 * 60_000,
    dateGroup: "Yesterday",
    model: "claude-sonnet-4-20250514",
    turns: [
      userTurn("u1", "Migrate from Electron 38 to 39.", "昨天 14:00"),
      assistantTurn({
        id: "a1",
        title: "Migration assessment",
        time: "昨天 14:01",
        activities: [
          activity("c1", "read_file", "success", "Read package.json", { elapsed: "0.2s" }),
        ],
        response: "Migration is feasible but was cancelled — team decided to wait for Tauri path.",
      }),
    ],
  },
];

export function useCraftAgentsOssMock() {
  const sessions = ref<CraftOssSession[]>(structuredClone(MOCK_SESSIONS));
  const activeSessionId = ref("new-session");
  const permissionMode = ref<CraftOssPermissionMode>("ask");
  const navFilter = ref<"all" | "flagged" | CraftOssTodoState>("all");
  const rightSidebarOpen = ref(true);
  const selectedActivityId = ref<string | null>(null);
  const expandedTurns = ref<Record<string, boolean>>({});
  const input = ref("");
  let simulationToken = 0;
  const sleepTimers = new Set<ReturnType<typeof setTimeout>>();

  const activeSession = computed(
    () => sessions.value.find((s) => s.id === activeSessionId.value) ?? sessions.value[0],
  );

  const filteredSessions = computed(() => {
    let list = sessions.value;
    if (navFilter.value === "flagged") {
      list = list.filter((s) => s.isFlagged);
    } else if (navFilter.value !== "all") {
      list = list.filter((s) => s.todoState === navFilter.value);
    }
    return [...list].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  });

  const groupedSessions = computed(() => {
    const groups = new Map<string, CraftOssSession[]>();
    for (const session of filteredSessions.value) {
      const label = session.dateGroup;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(session);
    }
    const order = ["Today", "Yesterday"];
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      })
      .map(([label, items]) => ({ label, items }));
  });

  const turns = computed(() => activeSession.value?.turns ?? []);

  const selectedActivity = computed(() => {
    const id = selectedActivityId.value;
    if (!id) return null;
    for (const turn of turns.value) {
      if (turn.type !== "assistant") continue;
      const found = turn.activities.find((a) => a.id === id);
      if (found) return found;
    }
    return null;
  });

  const activeWorkCount = computed(() => {
    const session = activeSession.value;
    if (!session) return 0;
    if (session.isProcessing) return 1;
    return turns.value.reduce((count, turn) => {
      if (turn.type !== "assistant") return count;
      return (
        count +
        turn.activities.filter((a) => a.status === "running" || a.status === "pending").length
      );
    }, 0);
  });

  function selectSession(id: string) {
    activeSessionId.value = id;
    const session = sessions.value.find((s) => s.id === id);
    if (session) permissionMode.value = session.permissionMode;
    const firstActivity = session?.turns.find((t) => t.type === "assistant")?.activities[0];
    selectedActivityId.value = firstActivity?.id ?? null;
  }

  function setNavFilter(filter: typeof navFilter.value) {
    navFilter.value = filter;
  }

  function cyclePermissionMode() {
    const order = CRAFT_OSS_PERMISSION_ORDER;
    const idx = order.indexOf(permissionMode.value);
    permissionMode.value = order[(idx + 1) % order.length];
  }

  function isTurnExpanded(turnId: string, turn: CraftAssistantTurn) {
    if (turnId in expandedTurns.value) return expandedTurns.value[turnId];
    return turn.phase !== "complete" || turn.activities.length <= 5;
  }

  function toggleTurn(turnId: string) {
    expandedTurns.value = { ...expandedTurns.value, [turnId]: !expandedTurns.value[turnId] };
  }

  function toggleRightSidebar() {
    rightSidebarOpen.value = !rightSidebarOpen.value;
  }

  function patchSession(sessionId: string, patch: Partial<CraftOssSession>) {
    const idx = sessions.value.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;
    sessions.value[idx] = { ...sessions.value[idx], ...patch };
  }

  function patchAssistantTurn(
    sessionId: string,
    turnId: string,
    patch: Partial<{
      title: string;
      activities: CraftActivity[];
      response: string;
      streaming: boolean;
      complete: boolean;
      interrupted: boolean;
    }>,
  ) {
    const idx = sessions.value.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;
    const session = sessions.value[idx];
    const turnsList = session.turns.map((turn) => {
      if (turn.type !== "assistant" || turn.id !== turnId) return turn;
      return assistantTurn({
        id: turn.id,
        title: patch.title ?? turn.title,
        time: turn.time,
        activities: patch.activities ?? turn.activities,
        response: patch.response ?? turn.response,
        streaming: patch.streaming ?? turn.streaming,
        complete: patch.complete ?? turn.complete,
        interrupted: patch.interrupted ?? turn.interrupted,
      });
    });
    sessions.value[idx] = { ...session, turns: turnsList };
  }

  function sleep(ms: number, token: number) {
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        sleepTimers.delete(timer);
        if (token !== simulationToken) {
          reject(new SimulationAborted());
          return;
        }
        resolve();
      }, ms);
      sleepTimers.add(timer);
    });
  }

  function clearSleepTimers() {
    for (const timer of sleepTimers) {
      window.clearTimeout(timer);
    }
    sleepTimers.clear();
  }

  function stopSimulation() {
    simulationToken += 1;
    clearSleepTimers();

    const session = sessions.value.find((s) => s.id === activeSessionId.value);
    if (!session?.isProcessing) return;

    const lastAssistant = [...session.turns].reverse().find((t) => t.type === "assistant");
    if (lastAssistant?.type === "assistant" && !lastAssistant.complete) {
      patchAssistantTurn(session.id, lastAssistant.id, {
        streaming: false,
        complete: true,
        interrupted: true,
      });
    }
    patchSession(session.id, {
      isProcessing: false,
      preview: "Stopped",
      demoState: "stopped",
      demoLabel: "已中断（模拟）",
    });
  }

  async function runActivityStep(
    sessionId: string,
    turnId: string,
    step: (typeof SIMULATION_STEPS)[number],
    token: number,
  ) {
    const activities: CraftActivity[] = [];
    const prior = sessions.value.find((s) => s.id === sessionId);
    const priorTurn = prior?.turns.find((t) => t.type === "assistant" && t.id === turnId);
    if (priorTurn?.type === "assistant") {
      activities.push(...priorTurn.activities);
    }

    activities.push(
      activity(step.id, step.toolName, "pending", step.title, {
        description: step.description,
        fileName: step.fileName,
      }),
    );
    patchAssistantTurn(sessionId, turnId, {
      activities,
      response: "",
      streaming: false,
      complete: false,
    });
    selectedActivityId.value = step.id;
    await sleep(220, token);

    const running = activities.map((a) =>
      a.id === step.id ? { ...a, status: "running" as const } : a,
    );
    patchAssistantTurn(sessionId, turnId, { activities: running });
    await sleep(step.runMs, token);

    const done = running.map((a) =>
      a.id === step.id
        ? {
            ...a,
            status: "success" as const,
            elapsed: `${(step.runMs / 1000).toFixed(1)}s`,
          }
        : a,
    );
    patchAssistantTurn(sessionId, turnId, { activities: done });
  }

  async function streamResponse(
    sessionId: string,
    turnId: string,
    fullText: string,
    token: number,
  ) {
    patchAssistantTurn(sessionId, turnId, {
      response: "",
      streaming: true,
      complete: false,
    });
    await sleep(350, token);

    const chunkSize = 4;
    for (let i = chunkSize; i <= fullText.length; i += chunkSize) {
      patchAssistantTurn(sessionId, turnId, {
        response: fullText.slice(0, i),
        streaming: i < fullText.length,
        complete: false,
      });
      await sleep(28 + Math.floor(Math.random() * 18), token);
    }
    patchAssistantTurn(sessionId, turnId, {
      response: fullText,
      streaming: false,
      complete: true,
    });
  }

  async function sendMessage(rawText?: string) {
    const text = (rawText ?? input.value).trim();
    const session = activeSession.value;
    if (!text || session.isProcessing || session.pendingPermission) return;

    const token = ++simulationToken;
    clearSleepTimers();

    const sessionId = session.id;
    const now = formatNow();
    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;
    const userContent = text;

    const nextTurns: CraftTurn[] = [
      ...session.turns,
      userTurn(userId, userContent, now),
      assistantTurn({
        id: assistantId,
        title: "Working on your request",
        time: now,
        activities: [],
        response: "",
        streaming: false,
        complete: false,
      }),
    ];

    patchSession(sessionId, {
      turns: nextTurns,
      isProcessing: true,
      pendingPermission: undefined,
      isUnread: false,
      lastMessageRole: "assistant",
      lastMessageAt: Date.now(),
      dateGroup: "Today",
      preview: truncate(userContent, 48),
      name: session.name === "New Chat" ? truncate(userContent, 36) : session.name,
      permissionMode: permissionMode.value,
      demoState: "streaming",
      demoLabel: "Streaming（模拟）",
    });
    input.value = "";
    expandedTurns.value = { ...expandedTurns.value, [assistantId]: true };

    try {
      await sleep(700, token);

      for (const step of SIMULATION_STEPS) {
        await runActivityStep(sessionId, assistantId, step, token);
        await sleep(180, token);
      }

      await sleep(300, token);
      const response = buildMockResponse(userContent);
      await streamResponse(sessionId, assistantId, response, token);

      patchSession(sessionId, {
        isProcessing: false,
        preview: truncate(
          response
            .replace(/^#+\s+/m, "")
            .split("\n")
            .find((l) => l.trim()) ?? "Done",
          48,
        ),
        lastMessageRole: "assistant",
        demoState: "completed",
        demoLabel: "已完成（模拟）",
        todoState: session.todoState === "backlog" ? "todo" : session.todoState,
      });
      selectedActivityId.value = SIMULATION_STEPS[SIMULATION_STEPS.length - 1]?.id ?? null;
    } catch (error) {
      if (error instanceof SimulationAborted) return;
      patchSession(sessionId, { isProcessing: false });
    }
  }

  function disposeSimulation() {
    stopSimulation();
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    filteredSessions,
    groupedSessions,
    turns,
    permissionMode,
    navFilter,
    rightSidebarOpen,
    selectedActivityId,
    selectedActivity,
    activeWorkCount,
    expandedTurns,
    input,
    selectSession,
    setNavFilter,
    cyclePermissionMode,
    isTurnExpanded,
    toggleTurn,
    toggleRightSidebar,
    sendMessage,
    stopSimulation,
    disposeSimulation,
    demoCatalog: CRAFT_OSS_DEMO_CATALOG,
  };
}
