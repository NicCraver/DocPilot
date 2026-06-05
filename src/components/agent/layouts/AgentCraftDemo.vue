<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";

type ActivityStatus = "pending" | "running" | "success" | "error";
type PermissionMode = "ask" | "auto" | "safe";

interface Activity {
  id: string;
  toolName: string;
  status: ActivityStatus;
  title: string;
  description?: string;
  input?: string;
  output?: string;
  fileName?: string;
  additions?: number;
  deletions?: number;
  elapsed?: string;
}

interface UserTurn {
  id: string;
  type: "user";
  content: string;
  time: string;
  attachments?: string[];
}

interface AssistantTurn {
  id: string;
  type: "assistant";
  title: string;
  activities: Activity[];
  response: string;
  time: string;
  streaming: boolean;
  complete: boolean;
  expanded: boolean;
  plan?: boolean;
  planAccepted?: boolean;
}

type Turn = UserTurn | AssistantTurn;

interface PermissionRequest {
  turnId: string;
  activityId: string;
  command: string;
}

const sessions = [
  {
    id: "contract-risk",
    title: "合同风险摘要",
    preview: "OCR, 条款抽取, 风险标注",
    state: "active",
    label: "Legal",
  },
  {
    id: "medical-summary",
    title: "病例材料整理",
    preview: "就诊时间线与材料归档",
    state: "queued",
    label: "Docs",
  },
  {
    id: "bid-compare",
    title: "招标文件对比",
    preview: "差异项与评分项",
    state: "done",
    label: "Review",
  },
] as const;

const seedTurns: Turn[] = [
  {
    id: "u-1",
    type: "user",
    content: "把合同上传后的 OCR 结果整理成一份摘要，然后标出风险条款。",
    attachments: ["采购合同_OCR.pdf", "供应商补充协议.docx"],
    time: "09:41",
  },
  {
    id: "a-1",
    type: "assistant",
    title: "已完成文档风险初筛",
    expanded: false,
    streaming: false,
    complete: true,
    time: "09:43",
    activities: [
      {
        id: "act-1",
        toolName: "Read",
        status: "success",
        title: "Read",
        description: "读取 OCR 文本与补充协议",
        fileName: "采购合同_OCR.pdf",
        input: "file_path: /contracts/采购合同_OCR.pdf",
        output: "读取 42 页文本，识别到 18 个主要章节。",
      },
      {
        id: "act-2",
        toolName: "Search",
        status: "success",
        title: "Risk Pattern Search",
        description: "匹配违约、付款、保密和终止条款",
        input: "pattern: 违约|赔偿|保密|终止|不可抗力",
        output: "命中 31 处，其中 7 处需要人工复核。",
      },
      {
        id: "act-3",
        toolName: "Edit",
        status: "success",
        title: "Draft Summary",
        description: "生成结构化摘要",
        fileName: "risk-summary.md",
        additions: 96,
        deletions: 4,
        output: "已创建风险摘要草稿。",
      },
    ],
    response:
      "合同摘要已经整理好。重点风险集中在付款节点、单方验收、违约金上限和数据保密四块；其中“乙方交付即视为甲方验收通过”建议改成带验收期限和异议窗口的表述。",
  },
  {
    id: "u-2",
    type: "user",
    content: "先给我一个执行计划，再开始生成正式审阅稿。",
    time: "09:46",
  },
  {
    id: "a-2",
    type: "assistant",
    title: "等待计划确认",
    expanded: true,
    streaming: false,
    complete: true,
    plan: true,
    planAccepted: false,
    time: "09:46",
    activities: [
      {
        id: "act-4",
        toolName: "Plan",
        status: "success",
        title: "Plan",
        description: "拆分正式审阅稿流程",
        output: "计划已生成，等待用户确认。",
      },
    ],
    response:
      "1. 重新读取合同正文、附件和补充协议。\n2. 建立条款索引，按付款、交付、验收、保密、解除、争议解决分组。\n3. 对高风险条款生成“原文摘录、风险说明、修改建议”。\n4. 输出正式审阅稿，并保留待人工确认的问题列表。",
  },
];

const modeLabel: Record<PermissionMode, string> = {
  ask: "Ask",
  auto: "Auto",
  safe: "Safe",
};

const modeOrder: PermissionMode[] = ["ask", "auto", "safe"];

const activeSessionId = ref("contract-risk");
const turns = shallowRef<Turn[]>(cloneTurns(seedTurns));
const input = ref("");
const attachments = shallowRef<string[]>([]);
const permissionMode = ref<PermissionMode>("ask");
const processing = ref(false);
const pendingPermission = shallowRef<PermissionRequest | null>(null);
const selectedActivity = shallowRef<Activity | null>((seedTurns[1] as AssistantTurn).activities[0]);
const chatScroll = ref<HTMLElement | null>(null);
const timers: number[] = [];

const activeSession = computed(
  () => sessions.find((session) => session.id === activeSessionId.value) ?? sessions[0],
);

const runningActivities = computed(() =>
  turns.value.flatMap((turn) =>
    turn.type === "assistant"
      ? turn.activities.filter(
          (activity) => activity.status === "running" || activity.status === "pending",
        )
      : [],
  ),
);

watch(
  () => [turns.value, pendingPermission.value],
  () => {
    nextTick(() => {
      chatScroll.value?.scrollTo({ top: chatScroll.value.scrollHeight, behavior: "smooth" });
    });
  },
);

onBeforeUnmount(() => clearAllTimers());

function cloneTurns(source: Turn[]): Turn[] {
  return source.map((turn) => {
    if (turn.type === "user")
      return { ...turn, attachments: turn.attachments ? [...turn.attachments] : undefined };
    return { ...turn, activities: turn.activities.map((activity) => ({ ...activity })) };
  });
}

function blocks(text: string) {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^(\d+)\.\s+(.*)$/);
      return match ? { raw: line, number: match[1], text: match[2] } : { raw: line, text: line };
    });
}

function nowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clearAllTimers() {
  while (timers.length > 0) {
    const id = timers.pop();
    if (id !== undefined) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
  }
}

function schedule(callback: () => void, delay: number) {
  timers.push(window.setTimeout(callback, delay));
}

function updateAssistant(turnId: string, updater: (turn: AssistantTurn) => AssistantTurn) {
  turns.value = turns.value.map((turn) => {
    if (turn.type !== "assistant" || turn.id !== turnId) return turn;
    return updater(turn);
  });
}

function updateActivity(turnId: string, activityId: string, patch: Partial<Activity>) {
  updateAssistant(turnId, (turn) => ({
    ...turn,
    activities: turn.activities.map((activity) => {
      if (activity.id !== activityId) return activity;
      const next = { ...activity, ...patch };
      if (selectedActivity.value?.id === activityId) selectedActivity.value = next;
      return next;
    }),
  }));
}

function pushActivity(turnId: string, activity: Activity) {
  updateAssistant(turnId, (turn) => ({
    ...turn,
    activities: [...turn.activities, activity],
    title: activity.description || activity.title,
    expanded: true,
  }));
  selectedActivity.value = activity;
}

function streamResponse(turnId: string, text: string) {
  updateAssistant(turnId, (turn) => ({
    ...turn,
    response: "",
    streaming: true,
    title: "正在生成回复",
  }));

  let index = 0;
  const interval = window.setInterval(() => {
    index = Math.min(index + 8, text.length);
    updateAssistant(turnId, (turn) => ({
      ...turn,
      response: text.slice(0, index),
      streaming: index < text.length,
      complete: index >= text.length,
      title: index >= text.length ? "已完成正式审阅稿" : "正在生成回复",
    }));

    if (index >= text.length) {
      window.clearInterval(interval);
      const timerIndex = timers.indexOf(interval);
      if (timerIndex >= 0) timers.splice(timerIndex, 1);
      processing.value = false;
    }
  }, 34);
  timers.push(interval);
}

function submitMessage() {
  const text = input.value.trim();
  if (!text || processing.value || pendingPermission.value) return;
  startAgentRun(text);
}

function startAgentRun(message: string) {
  clearAllTimers();
  pendingPermission.value = null;
  processing.value = true;

  const turnId = makeId("assistant");
  const nextTurns: Turn[] = [
    {
      id: makeId("user"),
      type: "user",
      content: message,
      attachments: attachments.value,
      time: nowTime(),
    },
    {
      id: turnId,
      type: "assistant",
      title: "准备处理",
      activities: [],
      response: "",
      time: nowTime(),
      streaming: true,
      complete: false,
      expanded: true,
    },
  ];

  turns.value = [...turns.value, ...nextTurns];
  input.value = "";
  attachments.value = [];

  const thinkingId = makeId("act");
  const searchId = makeId("act");
  const readId = makeId("act");
  const bashId = makeId("act");

  schedule(() => {
    pushActivity(turnId, {
      id: thinkingId,
      toolName: "Thinking",
      status: "running",
      title: "Thinking",
      description: "分析目标和上下文",
      output: "正在确认文档类型、产出格式和风险分类。",
    });
  }, 250);

  schedule(() => {
    updateActivity(turnId, thinkingId, { status: "success", elapsed: "0.7s" });
    pushActivity(turnId, {
      id: searchId,
      toolName: "Search",
      status: "running",
      title: "Search",
      description: "检索相关条款与历史审阅稿",
      input: "query: payment acceptance confidentiality termination",
    });
  }, 950);

  schedule(() => {
    updateActivity(turnId, searchId, {
      status: "success",
      elapsed: "1.1s",
      output: "找到 13 个相似审阅片段和 4 个风险模板。",
    });
    pushActivity(turnId, {
      id: readId,
      toolName: "Read",
      status: "running",
      title: "Read",
      description: "读取合同正文与附件",
      fileName: "供应商补充协议.docx",
      input: "file_path: /workspace/contracts/供应商补充协议.docx",
    });
  }, 1850);

  schedule(() => {
    updateActivity(turnId, readId, {
      status: "success",
      elapsed: "0.9s",
      output: "读取 6 个附件，抽取 22 条可引用条款。",
    });
    pushActivity(turnId, {
      id: bashId,
      toolName: "Bash",
      status: permissionMode.value === "auto" ? "running" : "pending",
      title: "Run verification",
      description: "运行审阅稿格式校验",
      input: "npm run lint:review -- contracts/risk-summary.md",
    });

    if (permissionMode.value === "auto") {
      continueAfterPermission(turnId, bashId);
    } else {
      processing.value = false;
      pendingPermission.value = {
        turnId,
        activityId: bashId,
        command: "npm run lint:review -- contracts/risk-summary.md",
      };
    }
  }, 2800);
}

function continueAfterPermission(turnId: string, activityId: string) {
  pendingPermission.value = null;
  processing.value = true;
  updateActivity(turnId, activityId, { status: "running", output: undefined });

  const editId = makeId("act");
  const previewId = makeId("act");

  schedule(() => {
    updateActivity(turnId, activityId, {
      status: "success",
      elapsed: "1.4s",
      output: "格式校验通过，发现 2 处引用编号可优化。",
    });
    pushActivity(turnId, {
      id: editId,
      toolName: "Edit",
      status: "running",
      title: "Compose Review Draft",
      description: "写入正式审阅稿",
      fileName: "formal-review.md",
      additions: 128,
      deletions: 7,
      input: "changes: formal-review.md",
    });
  }, 1200);

  schedule(() => {
    updateActivity(turnId, editId, {
      status: "success",
      elapsed: "2.2s",
      output: "已生成正式审阅稿，并附上问题列表。",
    });
    pushActivity(turnId, {
      id: previewId,
      toolName: "Preview",
      status: "running",
      title: "Preview",
      description: "检查导出视图",
      input: "route: /review/formal-review",
    });
  }, 2600);

  schedule(() => {
    updateActivity(turnId, previewId, {
      status: "success",
      elapsed: "0.8s",
      output: "导出预览正常，长条款已自动换行。",
    });
    streamResponse(
      turnId,
      "正式审阅稿已生成。高风险项包括：\n1. 付款条件缺少验收异议期，建议补充 5 个工作日确认窗口。\n2. 违约责任只约束乙方，建议加入甲方逾期付款责任。\n3. 保密条款没有约定数据销毁，建议加入终止后 30 日内销毁或返还。\n\n我还保留了一份待确认问题列表，方便你逐条决定是否采纳修改建议。",
    );
  }, 3700);
}

function denyPermission() {
  if (!pendingPermission.value) return;
  clearAllTimers();
  updateActivity(pendingPermission.value.turnId, pendingPermission.value.activityId, {
    status: "error",
    output: "用户拒绝执行命令。",
  });
  updateAssistant(pendingPermission.value.turnId, (turn) => ({
    ...turn,
    response:
      "我已跳过本次命令执行，并保留当前草稿状态。可以继续手动审阅，也可以换成不需要命令的检查方式。",
    streaming: false,
    complete: true,
    title: "已跳过命令",
  }));
  pendingPermission.value = null;
  processing.value = false;
}

function allowPermission(alwaysAllow = false) {
  if (!pendingPermission.value) return;
  if (alwaysAllow) permissionMode.value = "auto";
  continueAfterPermission(pendingPermission.value.turnId, pendingPermission.value.activityId);
}

function acceptPlan(turnId: string) {
  updateAssistant(turnId, (turn) => ({
    ...turn,
    planAccepted: true,
    title: "计划已确认",
  }));
  startAgentRun("执行已确认计划，生成正式审阅稿。");
}

function stopProcessing() {
  clearAllTimers();
  processing.value = false;
  pendingPermission.value = null;

  const latest = [...turns.value]
    .reverse()
    .find((turn): turn is AssistantTurn => turn.type === "assistant" && !turn.complete);
  if (!latest) return;

  updateAssistant(latest.id, (turn) => ({
    ...turn,
    activities: turn.activities.map((activity) =>
      activity.status === "running" || activity.status === "pending"
        ? { ...activity, status: "error", output: "当前回合已中止。" }
        : activity,
    ),
    response: turn.response || "当前 agent 回合已中止。",
    streaming: false,
    complete: true,
    title: "已中止",
  }));
}

function cycleMode() {
  const index = modeOrder.indexOf(permissionMode.value);
  permissionMode.value = modeOrder[(index + 1) % modeOrder.length];
}

function onTextareaKeydown(event: KeyboardEvent) {
  if (event.key === "Tab" && event.shiftKey) {
    event.preventDefault();
    cycleMode();
    return;
  }
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitMessage();
  }
}

function addAttachment() {
  if (!attachments.value.includes("新增材料.pdf")) {
    attachments.value = [...attachments.value, "新增材料.pdf"];
  }
}

function removeAttachment(attachment: string) {
  attachments.value = attachments.value.filter((item) => item !== attachment);
}

function toggleTurn(turnId: string) {
  updateAssistant(turnId, (turn) => ({ ...turn, expanded: !turn.expanded }));
}

function previewText(turn: AssistantTurn) {
  const running = turn.activities.find((activity) => activity.status === "running");
  if (running) return running.description || running.title;
  const pending = turn.activities.find((activity) => activity.status === "pending");
  if (pending) return `Waiting for ${pending.title}`;
  if (turn.streaming) return "Preparing response";
  if (turn.plan && !turn.planAccepted) return "Plan ready";
  return turn.title || "Steps completed";
}

function activityKind(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("think")) return "think";
  if (name.includes("read")) return "read";
  if (name.includes("search")) return "search";
  if (name.includes("edit") || name.includes("draft") || name.includes("compose")) return "edit";
  if (name.includes("bash") || name.includes("run") || name.includes("terminal")) return "terminal";
  if (name.includes("plan")) return "plan";
  if (name.includes("preview")) return "preview";
  return "agent";
}

function activityIconClass(toolName: string) {
  switch (activityKind(toolName)) {
    case "think":
      return "i-lucide-sparkles";
    case "read":
      return "i-lucide-book-open-text";
    case "search":
      return "i-lucide-text-search";
    case "edit":
      return "i-lucide-notebook-pen";
    case "terminal":
      return "i-lucide-square-terminal";
    case "plan":
      return "i-lucide-clipboard-list";
    case "preview":
      return "i-lucide-scan-eye";
    default:
      return "i-lucide-wand-sparkles";
  }
}
</script>

<template>
  <section class="craft-demo" aria-label="Craft Agent Demo">
    <aside class="craft-session-rail" aria-label="Craft demo sessions">
      <div class="craft-rail-header">
        <div class="craft-logo" aria-hidden="true">
          <span class="i-lucide-list-tree craft-logo-icon" />
        </div>
        <div>
          <p>Craft Demo</p>
          <span>Agent turns</span>
        </div>
      </div>

      <div class="craft-session-list">
        <button
          v-for="session in sessions"
          :key="session.id"
          :class="['craft-session-row', session.id === activeSessionId && 'is-active']"
          type="button"
          @click="activeSessionId = session.id"
        >
          <span :class="['craft-state-dot', session.state]" />
          <span class="craft-session-text">
            <strong>{{ session.title }}</strong>
            <small>{{ session.preview }}</small>
          </span>
          <span class="craft-pill">{{ session.label }}</span>
        </button>
      </div>
    </aside>

    <main class="craft-chat">
      <header class="craft-chat-header">
        <div>
          <p>{{ activeSession.title }}</p>
          <span>{{ activeSession.preview }}</span>
        </div>
        <span :class="['craft-pill', runningActivities.length ? 'is-info' : 'is-success']">
          {{ runningActivities.length ? `${runningActivities.length} running` : "idle" }}
        </span>
      </header>

      <div ref="chatScroll" class="craft-message-scroll" role="log" aria-live="polite">
        <div class="craft-message-stack">
          <template v-for="turn in turns" :key="turn.id">
            <div v-if="turn.type === 'user'" class="craft-user-turn">
              <div v-if="turn.attachments?.length" class="craft-attachment-row">
                <span
                  v-for="attachment in turn.attachments"
                  :key="attachment"
                  class="craft-attachment"
                >
                  {{ attachment }}
                </span>
              </div>
              <div class="craft-user-bubble">
                <p v-for="block in blocks(turn.content)" :key="block.raw">{{ block.text }}</p>
              </div>
              <time>{{ turn.time }}</time>
            </div>

            <section v-else class="craft-assistant-turn">
              <div v-if="turn.activities.length" class="craft-turn-card">
                <div class="craft-turn-header">
                  <button class="craft-turn-toggle" type="button" @click="toggleTurn(turn.id)">
                    <span
                      :class="[
                        'i-lucide-chevron-right',
                        'craft-chevron',
                        turn.expanded && 'is-open',
                      ]"
                      aria-hidden="true"
                    />
                    <span class="craft-step-count">{{ turn.activities.length }}</span>
                    <span class="craft-preview">{{ previewText(turn) }}</span>
                  </button>
                  <button class="craft-icon-button" type="button" aria-label="Copy turn">
                    <span class="i-lucide-copy craft-action-icon" aria-hidden="true" />
                  </button>
                  <button class="craft-icon-button" type="button" aria-label="Branch turn">
                    <span class="i-lucide-git-branch craft-action-icon" aria-hidden="true" />
                  </button>
                </div>

                <div v-if="turn.expanded" class="craft-activity-list">
                  <button
                    v-for="activity in turn.activities"
                    :key="activity.id"
                    class="craft-activity-row"
                    type="button"
                    @click="selectedActivity = activity"
                  >
                    <span :class="['craft-status', activity.status]" aria-hidden="true" />
                    <span
                      :class="['craft-tool-shell', activityKind(activity.toolName)]"
                      aria-hidden="true"
                    >
                      <span :class="['craft-tool-icon', activityIconClass(activity.toolName)]" />
                    </span>
                    <span class="craft-activity-title">{{ activity.title }}</span>
                    <span v-if="activity.description" class="craft-separator">·</span>
                    <span v-if="activity.description" class="craft-activity-description">
                      {{ activity.description }}
                    </span>
                    <span v-if="activity.additions !== undefined" class="craft-diff add"
                      >+{{ activity.additions }}</span
                    >
                    <span v-if="activity.deletions" class="craft-diff del"
                      >-{{ activity.deletions }}</span
                    >
                    <span v-if="activity.fileName" class="craft-file">{{ activity.fileName }}</span>
                    <span v-if="activity.elapsed" class="craft-elapsed">{{
                      activity.elapsed
                    }}</span>
                  </button>
                </div>
              </div>

              <article v-if="turn.response" :class="['craft-response', turn.plan && 'is-plan']">
                <div v-if="turn.plan" class="craft-plan-header">
                  <span>
                    <span class="craft-tool-shell plan" aria-hidden="true">
                      <span class="craft-tool-icon i-lucide-clipboard-list" />
                    </span>
                    Plan
                  </span>
                  <span v-if="turn.planAccepted" class="craft-pill is-success">Accepted</span>
                  <button v-else class="craft-accept" type="button" @click="acceptPlan(turn.id)">
                    <span class="i-lucide-play craft-action-icon" aria-hidden="true" />
                    Accept
                  </button>
                </div>
                <div class="craft-markdown">
                  <p
                    v-for="block in blocks(turn.response)"
                    :key="block.raw"
                    :class="block.number && 'numbered'"
                  >
                    <template v-if="block.number">
                      <span>{{ block.number }}</span
                      >{{ block.text }}
                    </template>
                    <template v-else>{{ block.text }}</template>
                  </p>
                </div>
                <span v-if="turn.streaming" class="craft-caret" aria-hidden="true" />
              </article>
            </section>
          </template>
        </div>
      </div>

      <div v-if="pendingPermission" class="craft-permission">
        <div>
          <strong>Command Permission</strong>
          <code>{{ pendingPermission.command }}</code>
        </div>
        <div class="craft-permission-actions">
          <button type="button" @click="denyPermission">Deny</button>
          <button type="button" @click="allowPermission(false)">Allow once</button>
          <button type="button" class="primary" @click="allowPermission(true)">Always allow</button>
        </div>
      </div>

      <form v-else class="craft-composer-wrap" @submit.prevent="submitMessage">
        <div class="craft-option-row">
          <button
            :class="['craft-option', `mode-${permissionMode}`]"
            type="button"
            @click="cycleMode"
          >
            {{ modeLabel[permissionMode] }}
          </button>
          <button class="craft-option" type="button">Claude Sonnet 4</button>
          <button class="craft-option" type="button">/contracts</button>
        </div>

        <div class="craft-composer">
          <div v-if="attachments.length" class="craft-attachment-row">
            <span v-for="attachment in attachments" :key="attachment" class="craft-attachment">
              {{ attachment }}
              <button
                type="button"
                :aria-label="`移除 ${attachment}`"
                @click="removeAttachment(attachment)"
              >
                <span class="i-lucide-x craft-remove-icon" aria-hidden="true" />
              </button>
            </span>
          </div>
          <textarea
            v-model="input"
            rows="3"
            placeholder="让 DocPilot 处理文档、生成摘要或继续审阅"
            :disabled="processing"
            @keydown="onTextareaKeydown"
          />
          <div class="craft-composer-bar">
            <button
              type="button"
              class="craft-icon-button is-framed"
              aria-label="Attach file"
              @click="addAttachment"
            >
              <span class="i-lucide-paperclip craft-action-icon" aria-hidden="true" />
            </button>
            <div class="craft-segmented" role="group" aria-label="Permission mode">
              <button
                v-for="mode in modeOrder"
                :key="mode"
                :class="mode === permissionMode && 'is-selected'"
                type="button"
                @click="permissionMode = mode"
              >
                {{ modeLabel[mode] }}
              </button>
            </div>
            <button
              v-if="processing"
              class="craft-send is-stop"
              type="button"
              aria-label="Stop"
              @click="stopProcessing"
            >
              <span class="i-lucide-square craft-action-icon" aria-hidden="true" />
            </button>
            <button
              v-else
              class="craft-send"
              type="submit"
              aria-label="Send"
              :disabled="!input.trim()"
            >
              <span class="i-lucide-arrow-up craft-action-icon" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </main>

    <aside class="craft-inspector" aria-label="Craft activity detail">
      <div class="craft-inspector-head">
        <strong>Activity</strong>
        <span :class="['craft-pill', runningActivities.length ? 'is-info' : 'is-success']">
          {{ runningActivities.length ? "running" : "idle" }}
        </span>
      </div>
      <div v-if="selectedActivity" class="craft-inspector-body">
        <div class="craft-activity-hero">
          <span
            :class="['craft-tool-shell', activityKind(selectedActivity.toolName)]"
            aria-hidden="true"
          >
            <span :class="['craft-tool-icon', activityIconClass(selectedActivity.toolName)]" />
          </span>
          <div>
            <h3>{{ selectedActivity.title }}</h3>
            <span :class="['craft-status-text', selectedActivity.status]">{{
              selectedActivity.status
            }}</span>
          </div>
        </div>
        <section>
          <label>Description</label>
          <pre>{{ selectedActivity.description || "No description" }}</pre>
        </section>
        <section v-if="selectedActivity.input">
          <label>Input</label>
          <pre>{{ selectedActivity.input }}</pre>
        </section>
        <section v-if="selectedActivity.output">
          <label>Output</label>
          <pre>{{ selectedActivity.output }}</pre>
        </section>
      </div>
    </aside>
  </section>
</template>

<style scoped>
.craft-demo {
  display: grid;
  grid-template-columns: 14.5rem minmax(0, 1fr) 19rem;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.craft-session-rail,
.craft-chat,
.craft-inspector {
  min-height: 0;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xl);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-sm);
  overflow: hidden;
}

.craft-session-rail,
.craft-chat,
.craft-inspector {
  display: flex;
  flex-direction: column;
}

.craft-rail-header,
.craft-chat-header,
.craft-inspector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem;
  border-bottom: 1px solid var(--dp-border);
  background: var(--dp-surface-muted);
}

.craft-rail-header {
  justify-content: flex-start;
}

.craft-rail-header p,
.craft-chat-header p {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--dp-text);
}

.craft-rail-header span,
.craft-chat-header span {
  font-size: 0.75rem;
  color: var(--dp-text-muted);
}

.craft-logo {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--dp-radius-md);
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
}

.craft-logo-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.craft-action-icon,
.craft-remove-icon {
  width: 1rem;
  height: 1rem;
}

.craft-session-list {
  display: grid;
  gap: 0.375rem;
  padding: 0.625rem;
  overflow: auto;
}

.craft-session-row {
  display: grid;
  grid-template-columns: 0.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  min-height: 3.5rem;
  padding: 0.55rem;
  border-radius: var(--dp-radius-lg);
  text-align: left;
}

.craft-session-row:hover,
.craft-session-row.is-active {
  background: var(--dp-surface-muted);
}

.craft-session-row.is-active {
  box-shadow: inset 0 0 0 1px var(--dp-border);
}

.craft-session-text {
  min-width: 0;
}

.craft-session-text strong,
.craft-session-text small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.craft-session-text strong {
  font-size: 0.8125rem;
  color: var(--dp-text);
}

.craft-session-text small {
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: var(--dp-text-muted);
}

.craft-state-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--dp-text-muted);
}

.craft-state-dot.active {
  background: var(--dp-primary);
}

.craft-state-dot.queued {
  background: var(--dp-accent);
}

.craft-state-dot.done {
  background: var(--dp-success);
}

.craft-pill,
.craft-option,
.craft-diff,
.craft-file {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.45rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: var(--dp-surface-muted);
  color: var(--dp-text-secondary);
  font-size: 0.6875rem;
  font-weight: 650;
  white-space: nowrap;
}

.craft-pill.is-success {
  color: var(--dp-success);
  background: var(--dp-success-soft);
}

.craft-pill.is-info,
.craft-option.mode-auto {
  color: var(--dp-primary);
  background: var(--dp-primary-soft);
}

.craft-option.mode-ask {
  color: var(--dp-accent);
  background: var(--dp-accent-soft);
}

.craft-option.mode-safe {
  color: var(--dp-success);
  background: var(--dp-success-soft);
}

.craft-message-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1.25rem;
  background: color-mix(in srgb, var(--dp-surface-muted) 65%, white);
}

.craft-message-stack {
  display: grid;
  gap: 1rem;
  width: min(44rem, 100%);
  margin: 0 auto;
}

.craft-user-turn {
  display: grid;
  justify-items: end;
  gap: 0.3rem;
}

.craft-user-bubble {
  max-width: min(88%, 34rem);
  padding: 0.7rem 0.875rem;
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--dp-text) 6%, white);
  color: var(--dp-text);
  font-size: 0.875rem;
  line-height: 1.6;
}

.craft-user-turn time {
  color: var(--dp-text-muted);
  font-size: 0.6875rem;
}

.craft-attachment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.craft-attachment {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.7rem;
  max-width: 100%;
  padding: 0 0.45rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface);
  color: var(--dp-text-secondary);
  font-size: 0.75rem;
}

.craft-attachment button {
  display: inline-grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border-radius: 0.35rem;
  color: var(--dp-text-muted);
}

.craft-attachment button:hover {
  background: var(--dp-surface-muted);
}

.craft-assistant-turn {
  display: grid;
  gap: 0.5rem;
}

.craft-turn-card {
  display: grid;
  gap: 0.25rem;
}

.craft-turn-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.25rem;
  min-height: 2.35rem;
  padding: 0.25rem;
  border-radius: var(--dp-radius-lg);
  color: var(--dp-text-secondary);
}

.craft-turn-header:hover {
  background: color-mix(in srgb, var(--dp-border) 35%, transparent);
}

.craft-turn-toggle {
  display: grid;
  grid-template-columns: 1rem auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  min-height: 1.8rem;
  text-align: left;
}

.craft-chevron {
  width: 1rem;
  height: 1rem;
  transition: transform var(--dp-dur-fast) ease;
}

.craft-chevron.is-open {
  transform: rotate(90deg);
}

.craft-step-count {
  min-width: 1.5rem;
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--dp-border);
  border-radius: 0.4rem;
  background: var(--dp-surface);
  font-size: 0.6875rem;
  font-weight: 700;
  text-align: center;
}

.craft-preview,
.craft-activity-description {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.craft-preview,
.craft-activity-row {
  font-size: 0.8125rem;
}

.craft-icon-button {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: var(--dp-radius-sm);
  color: var(--dp-text-muted);
}

.craft-icon-button:hover,
.craft-icon-button.is-framed {
  background: var(--dp-surface-muted);
  color: var(--dp-text);
}

.craft-activity-list {
  display: grid;
  gap: 0.125rem;
  margin-left: 1rem;
  padding-left: 0.875rem;
  border-left: 2px solid var(--dp-border);
}

.craft-activity-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 1.85rem;
  min-width: 0;
  padding: 0.125rem 0.25rem;
  border-radius: var(--dp-radius-sm);
  color: var(--dp-text-muted);
  text-align: left;
}

.craft-activity-row:hover {
  background: var(--dp-surface-muted);
}

.craft-status {
  position: relative;
  width: 0.8rem;
  height: 0.8rem;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1.5px solid currentColor;
  color: var(--dp-text-muted);
}

.craft-status.running {
  border-color: color-mix(in srgb, var(--dp-primary) 25%, transparent);
  border-top-color: var(--dp-primary);
  animation: craft-spin 760ms linear infinite;
}

.craft-status.success {
  color: var(--dp-success);
}

.craft-status.success::after {
  position: absolute;
  left: 0.19rem;
  top: 0.1rem;
  width: 0.22rem;
  height: 0.4rem;
  border: solid currentColor;
  border-width: 0 1.5px 1.5px 0;
  content: "";
  transform: rotate(45deg);
}

.craft-status.error {
  color: var(--dp-danger);
}

.craft-tool-shell {
  display: inline-grid;
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
  place-items: center;
  border: none;
  border-radius: 0.42rem;
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
}

.craft-tool-shell.think,
.craft-tool-shell.agent {
  background: color-mix(in srgb, var(--dp-primary) 14%, white);
  color: var(--dp-primary);
}

.craft-tool-shell.search {
  background: #fff7ed;
  color: #c2410c;
}

.craft-tool-shell.read {
  background: #ecfdf5;
  color: #047857;
}

.craft-tool-shell.terminal {
  background: #f5f3ff;
  color: #6d28d9;
}

.craft-tool-shell.edit {
  background: #eff6ff;
  color: #1d4ed8;
}

.craft-tool-shell.plan {
  background: #fefce8;
  color: #a16207;
}

.craft-tool-shell.preview {
  background: #f0f9ff;
  color: #0369a1;
}

.craft-tool-icon {
  display: block;
  width: 0.875rem;
  height: 0.875rem;
}

.craft-activity-title {
  flex: 0 0 auto;
  color: var(--dp-text-secondary);
  font-weight: 650;
}

.craft-separator,
.craft-elapsed {
  color: var(--dp-text-muted);
}

.craft-elapsed {
  margin-left: auto;
  font-size: 0.6875rem;
}

.craft-diff {
  border-radius: 0.35rem;
}

.craft-diff.add {
  color: var(--dp-success);
  background: var(--dp-success-soft);
}

.craft-diff.del {
  color: var(--dp-danger);
  background: var(--dp-danger-soft);
}

.craft-file {
  max-width: 10rem;
  overflow: hidden;
  border-radius: 0.35rem;
  text-overflow: ellipsis;
}

.craft-response {
  position: relative;
  width: min(100%, 42rem);
  padding: 0.85rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-sm);
}

.craft-response.is-plan {
  border-color: color-mix(in srgb, var(--dp-accent) 28%, var(--dp-border));
  background: color-mix(in srgb, var(--dp-accent-soft) 38%, var(--dp-surface));
}

.craft-plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.craft-plan-header > span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--dp-accent);
  font-weight: 700;
}

.craft-accept,
.craft-permission-actions button,
.craft-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.35rem;
  padding: 0 0.75rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-text);
  color: white;
  font-size: 0.8125rem;
  font-weight: 700;
}

.craft-markdown {
  color: var(--dp-text);
  font-size: 0.875rem;
  line-height: 1.65;
}

.craft-markdown p + p,
.craft-user-bubble p + p {
  margin-top: 0.45rem;
}

.craft-markdown .numbered {
  display: grid;
  grid-template-columns: 1.4rem minmax(0, 1fr);
  gap: 0.25rem;
}

.craft-markdown .numbered span {
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.craft-caret {
  display: inline-block;
  width: 0.45rem;
  height: 1rem;
  margin-left: 0.2rem;
  vertical-align: -0.15rem;
  border-radius: 1px;
  background: var(--dp-primary);
  animation: craft-blink 1s steps(2, start) infinite;
}

.craft-permission,
.craft-composer-wrap {
  flex: 0 0 auto;
  padding: 0.75rem;
  border-top: 1px solid var(--dp-border);
  background: var(--dp-surface);
}

.craft-permission {
  display: grid;
  gap: 0.75rem;
}

.craft-permission strong {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--dp-accent);
  font-size: 0.875rem;
}

.craft-permission code {
  display: block;
  overflow: auto;
  padding: 0.625rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
  font-size: 0.8125rem;
  white-space: nowrap;
}

.craft-permission-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.craft-permission-actions button {
  background: var(--dp-surface-muted);
  color: var(--dp-text-secondary);
}

.craft-permission-actions button.primary {
  background: var(--dp-text);
  color: white;
}

.craft-option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.craft-composer {
  padding: 0.5rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-sm);
}

.craft-composer textarea {
  display: block;
  width: 100%;
  min-height: 4.5rem;
  resize: vertical;
  padding: 0.45rem;
  outline: 0;
  color: var(--dp-text);
  line-height: 1.5;
}

.craft-composer textarea::placeholder {
  color: var(--dp-text-muted);
}

.craft-composer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.35rem;
}

.craft-segmented {
  display: inline-flex;
  align-items: center;
  min-height: 2.2rem;
  padding: 0.18rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
}

.craft-segmented button {
  min-height: 1.85rem;
  min-width: 3.1rem;
  padding: 0 0.6rem;
  border-radius: var(--dp-radius-sm);
  color: var(--dp-text-secondary);
  font-size: 0.75rem;
  font-weight: 650;
}

.craft-segmented button.is-selected {
  background: var(--dp-surface);
  color: var(--dp-text);
  box-shadow: var(--dp-shadow-sm);
}

.craft-send {
  width: 2.35rem;
  padding: 0;
}

.craft-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.craft-send.is-stop {
  background: var(--dp-danger-soft);
  color: var(--dp-danger);
}

.craft-inspector-body {
  display: grid;
  gap: 0.875rem;
  overflow: auto;
  padding: 0.875rem;
}

.craft-activity-hero {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.craft-activity-hero .craft-tool-shell {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--dp-radius-md);
}

.craft-activity-hero .craft-tool-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.craft-activity-hero h3 {
  font-size: 0.95rem;
  font-weight: 800;
}

.craft-status-text {
  color: var(--dp-text-muted);
  font-size: 0.75rem;
  text-transform: capitalize;
}

.craft-status-text.running,
.craft-status-text.pending {
  color: var(--dp-primary);
}

.craft-status-text.success {
  color: var(--dp-success);
}

.craft-status-text.error {
  color: var(--dp-danger);
}

.craft-inspector section {
  display: grid;
  gap: 0.35rem;
}

.craft-inspector label {
  color: var(--dp-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.craft-inspector pre {
  overflow: auto;
  margin: 0;
  padding: 0.625rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
  color: var(--dp-text);
  font-size: 0.75rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

@keyframes craft-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes craft-blink {
  50% {
    opacity: 0;
  }
}

@media (max-width: 1180px) {
  .craft-demo {
    grid-template-columns: 13.5rem minmax(0, 1fr);
  }

  .craft-inspector {
    display: none;
  }
}

@media (max-width: 860px) {
  .craft-demo {
    grid-template-columns: minmax(0, 1fr);
  }

  .craft-session-rail {
    display: none;
  }
}

@media (max-width: 640px) {
  .craft-message-scroll {
    padding: 0.875rem;
  }

  .craft-user-bubble {
    max-width: 94%;
  }

  .craft-activity-row {
    flex-wrap: wrap;
  }

  .craft-activity-description {
    flex-basis: calc(100% - 4rem);
    margin-left: 3rem;
  }

  .craft-composer-bar {
    flex-wrap: wrap;
  }

  .craft-segmented {
    order: 3;
    width: 100%;
  }

  .craft-segmented button {
    flex: 1;
  }
}
</style>
