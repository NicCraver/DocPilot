<script setup lang="ts">
import { computed, ref, watch } from "vue";
import "../../styles/craft-agents-oss-theme.css";
import "../../styles/craft-agents-oss-messages.css";
import AgentMarkdown from "./AgentMarkdown.vue";
import { ossProcessingLabel } from "../../composables/craftOssMessageUi";
import type {
  CraftActivity,
  CraftAssistantTurn,
  CraftTurn,
} from "../../composables/useCraftAgentChat";

const ACTIVITY_LIMIT = 5;

const props = withDefaults(
  defineProps<{
    turns: CraftTurn[];
    loading?: boolean;
    elapsedSeconds?: number;
    selectedActivityId?: string | null;
    queuedMessage?: string | null;
    showAcceptPlan?: boolean;
    emptyDescription?: string;
    suggestions?: string[];
    resetKey?: string | number;
  }>(),
  {
    loading: false,
    elapsedSeconds: 0,
    selectedActivityId: null,
    queuedMessage: null,
    showAcceptPlan: false,
    emptyDescription: "通过自然语言调用本地 PDF / 图片工具。可添加文件附件后描述需求。",
    suggestions: () => [],
    resetKey: "default",
  },
);

const emit = defineEmits<{
  selectActivity: [activity: CraftActivity];
  applySuggestion: [text: string];
  acceptPlan: [];
}>();

const expandedTurns = ref<Record<string, boolean>>({});
const expandedActivityLists = ref<Record<string, boolean>>({});
const copiedTurnId = ref<string | null>(null);

watch(
  () => props.resetKey,
  () => {
    expandedTurns.value = {};
    expandedActivityLists.value = {};
    copiedTurnId.value = null;
  },
);

const isProcessing = computed(() => props.loading);

const activeAssistantTurn = computed(() => {
  for (let i = props.turns.length - 1; i >= 0; i--) {
    const turn = props.turns[i];
    if (turn.type === "assistant" && !turn.complete) return turn;
  }
  return null;
});

const processingLabel = computed(() =>
  ossProcessingLabel(props.elapsedSeconds, Boolean(activeAssistantTurn.value?.activities.length)),
);

function isEarlyThinking(turn: CraftAssistantTurn) {
  return (
    !turn.activities.length &&
    !turn.response &&
    turn.phase === "pending" &&
    turn.id === activeAssistantTurn.value?.id &&
    isProcessing.value
  );
}

function isTurnExpanded(turnId: string, turn: CraftAssistantTurn) {
  if (turnId in expandedTurns.value) return expandedTurns.value[turnId];
  return turn.phase !== "complete" || turn.activities.length <= ACTIVITY_LIMIT;
}

function toggleTurn(turnId: string) {
  expandedTurns.value = { ...expandedTurns.value, [turnId]: !expandedTurns.value[turnId] };
}

function visibleActivities(turn: CraftAssistantTurn) {
  if (expandedActivityLists.value[turn.id] || turn.activities.length <= ACTIVITY_LIMIT) {
    return turn.activities;
  }
  return turn.activities.slice(0, ACTIVITY_LIMIT);
}

function hiddenActivityCount(turn: CraftAssistantTurn) {
  return Math.max(0, turn.activities.length - ACTIVITY_LIMIT);
}

function toggleActivityList(turnId: string) {
  expandedActivityLists.value = {
    ...expandedActivityLists.value,
    [turnId]: !expandedActivityLists.value[turnId],
  };
}

function previewText(turn: CraftAssistantTurn) {
  const running = turn.activities.find((a) => a.status === "running");
  if (running) return running.description || running.title;
  const pending = turn.activities.find((a) => a.status === "pending");
  if (pending) return `等待：${pending.title}`;
  if (turn.phase === "pending") return "思考中…";
  if (turn.phase === "awaiting") return "准备回复…";
  if (turn.phase === "streaming") return "正在输出…";
  if (turn.interrupted) return "已停止";
  return turn.title || "步骤已完成";
}

function thinkingText(turn: CraftAssistantTurn) {
  if (turn.phase === "streaming") return "准备回复…";
  if (turn.activities.length) return "准备回复…";
  return "思考中…";
}

function activityKind(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("think") || name.includes("prepare")) return "kind-think";
  if (name.includes("read") || name.includes("get_") || name.includes("list")) return "kind-read";
  if (name.includes("search") || name.includes("github") || name.includes("craft"))
    return "kind-search";
  if (
    name.includes("edit") ||
    name.includes("write") ||
    name.includes("compress") ||
    name.includes("export")
  )
    return "kind-edit";
  if (name.includes("bash") || name.includes("terminal")) return "kind-terminal";
  if (name.includes("plan")) return "kind-plan";
  return "kind-agent";
}

function activityIconClass(toolName: string) {
  switch (activityKind(toolName)) {
    case "kind-think":
      return "i-lucide-sparkles";
    case "kind-read":
      return "i-lucide-book-open-text";
    case "kind-search":
      return "i-lucide-text-search";
    case "kind-edit":
      return "i-lucide-notebook-pen";
    case "kind-terminal":
      return "i-lucide-square-terminal";
    case "kind-plan":
      return "i-lucide-clipboard-list";
    default:
      return "i-lucide-wand-sparkles";
  }
}

function getFileTypeAndIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return { type: "PDF", icon: "i-lucide-file-text", class: "is-pdf" };
  if (["doc", "docx"].includes(ext))
    return { type: "Word", icon: "i-lucide-file-text", class: "is-word" };
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext))
    return { type: "Image", icon: "i-lucide-image", class: "is-image" };
  return { type: ext.toUpperCase() || "FILE", icon: "i-lucide-file", class: "is-default" };
}

async function writeClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall back to the selection API in WebViews that gate clipboard writes.
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyTurn(turn: CraftAssistantTurn) {
  await writeClipboard(turn.response || previewText(turn));
  copiedTurnId.value = turn.id;
  window.setTimeout(() => {
    if (copiedTurnId.value === turn.id) copiedTurnId.value = null;
  }, 1500);
}

async function copyResponse(turn: CraftAssistantTurn) {
  await writeClipboard(turn.response);
  copiedTurnId.value = turn.id;
  window.setTimeout(() => {
    if (copiedTurnId.value === turn.id) copiedTurnId.value = null;
  }, 1500);
}

function selectActivity(activity: CraftActivity) {
  emit("selectActivity", activity);
}

function onSuggestion(text: string) {
  emit("applySuggestion", text);
}

const lastTurnId = computed(() => props.turns[props.turns.length - 1]?.id);
</script>

<template>
  <div v-if="!turns.length" class="oss-empty">
    <h2>需要什么帮助？</h2>
    <p>{{ emptyDescription }}</p>
    <div v-if="suggestions.length" class="oss-demo-grid">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        type="button"
        class="oss-demo-card shadow-minimal"
        @click="onSuggestion(suggestion)"
      >
        <strong>{{ suggestion }}</strong>
      </button>
    </div>
    <slot v-else name="empty-footer" />
  </div>

  <div v-else class="oss-turns">
    <div v-if="queuedMessage" class="oss-queued shadow-minimal">
      <span class="i-lucide-clock" aria-hidden="true" />
      <span class="oss-queued-tag">已排队</span>
      <span>{{ queuedMessage }}</span>
    </div>

    <template v-for="turn in turns" :key="turn.id">
      <div v-if="turn.type === 'user'" class="oss-user">
        <div v-if="turn.attachments?.length" class="oss-user-files">
          <div
            v-for="file in turn.attachments"
            :key="file"
            :class="['oss-file-card shadow-minimal', getFileTypeAndIcon(file).class]"
          >
            <span :class="['oss-file-icon', getFileTypeAndIcon(file).icon]" aria-hidden="true" />
            <div class="oss-file-meta">
              <span class="oss-file-name" :title="file">{{ file }}</span>
              <span class="oss-file-type">{{ getFileTypeAndIcon(file).type }}</span>
            </div>
          </div>
        </div>
        <div class="oss-user-bubble">{{ turn.content }}</div>
      </div>

      <section v-else class="oss-assistant">
        <div v-if="isEarlyThinking(turn)" class="oss-inline-status">
          <span class="spinner-grid" aria-hidden="true">
            <span /><span /><span /><span /><span /><span /><span /><span /><span />
          </span>
          <span>{{ processingLabel }}</span>
        </div>

        <div v-else-if="turn.activities.length" class="oss-turn-card">
          <div class="oss-turn-head">
            <button class="oss-turn-toggle" type="button" @click="toggleTurn(turn.id)">
              <span
                :class="[
                  'i-lucide-chevron-right',
                  'oss-chevron',
                  isTurnExpanded(turn.id, turn) && 'is-open',
                ]"
                aria-hidden="true"
              />
              <span class="oss-turn-count">{{ turn.activities.length }}</span>
              <span class="oss-turn-preview">{{ previewText(turn) }}</span>
            </button>
            <button
              class="oss-icon-btn"
              type="button"
              :title="copiedTurnId === turn.id ? 'Copied' : 'Copy turn'"
              @click="copyTurn(turn)"
            >
              <span
                :class="copiedTurnId === turn.id ? 'i-lucide-check' : 'i-lucide-copy'"
                aria-hidden="true"
              />
            </button>
          </div>

          <div v-if="isTurnExpanded(turn.id, turn)" class="oss-activities">
            <button
              v-for="activity in visibleActivities(turn)"
              :key="activity.id"
              :class="['oss-activity', selectedActivityId === activity.id && 'is-selected']"
              type="button"
              @click="selectActivity(activity)"
            >
              <span :class="['oss-status-dot', activity.status]" />
              <span :class="['oss-act-icon', activityKind(activity.toolName)]">
                <span :class="activityIconClass(activity.toolName)" aria-hidden="true" />
              </span>
              <span class="oss-act-title">{{ activity.title }}</span>
              <span v-if="activity.description" class="oss-act-muted">·</span>
              <span v-if="activity.description" class="oss-act-muted">{{
                activity.description
              }}</span>
              <span v-if="activity.input" class="oss-act-cmd">{{ activity.input }}</span>
              <span v-if="activity.status === 'error'" class="oss-act-error">Error</span>
              <span v-if="activity.elapsed" class="oss-act-elapsed">{{ activity.elapsed }}</span>
            </button>
            <button
              v-if="hiddenActivityCount(turn) > 0 || expandedActivityLists[turn.id]"
              class="oss-act-more"
              type="button"
              @click="toggleActivityList(turn.id)"
            >
              {{
                expandedActivityLists[turn.id]
                  ? "Show less"
                  : `Show ${hiddenActivityCount(turn)} more`
              }}
            </button>
            <div v-if="turn.showThinkingIndicator && turn.activities.length" class="oss-thinking">
              <span class="oss-status-dot running" />
              <span class="oss-thinking-dot" />
              <span>{{ thinkingText(turn) }}</span>
            </div>
            <div
              v-if="isProcessing && turn.id === activeAssistantTurn?.id && turn.activities.length"
              class="oss-turn-status"
            >
              <span class="spinner-grid" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </span>
              <span>{{ processingLabel }}</span>
            </div>
          </div>
        </div>

        <article
          v-if="turn.response"
          :class="['oss-response shadow-minimal', turn.interrupted && 'is-stopped']"
        >
          <header class="oss-response-head">
            <span>回复</span>
            <span v-if="turn.streaming" class="oss-response-tag">输出中</span>
            <span v-else-if="turn.interrupted" class="oss-response-tag is-error">已停止</span>
            <button
              v-if="showAcceptPlan && turn.id === lastTurnId && !isProcessing"
              class="oss-accept-plan"
              type="button"
              @click="emit('acceptPlan')"
            >
              接受计划
              <span class="i-lucide-chevron-down" aria-hidden="true" />
            </button>
          </header>
          <div class="oss-response-body">
            <AgentMarkdown :content="turn.response" :streaming="turn.streaming" />
          </div>
          <footer v-if="!turn.streaming && turn.response" class="oss-response-foot">
            <button type="button" @click="copyResponse(turn)">
              <span
                :class="copiedTurnId === turn.id ? 'i-lucide-check' : 'i-lucide-copy'"
                aria-hidden="true"
              />
              {{ copiedTurnId === turn.id ? "已复制" : "复制" }}
            </button>
            <button type="button" @click="copyResponse(turn)">
              <span class="i-lucide-file-code" aria-hidden="true" />
              Markdown
            </button>
          </footer>
        </article>
      </section>
    </template>
  </div>
</template>
