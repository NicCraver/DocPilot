<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { useProviderSettings } from "../../../composables/useProviderSettings";
import { useAgentAttachments } from "../../../composables/useAgentAttachments";
import { attachmentChips } from "../../../agent/attachments";
import {
  CRAFT_PERMISSION_MODE_LABEL,
  CRAFT_PERMISSION_MODE_ORDER,
  useCraftAgentChat,
  type CraftActivity,
  type CraftPermissionMode,
} from "../../../composables/useCraftAgentChat";
import CraftOssMessageFlow from "../CraftOssMessageFlow.vue";
import "../../../styles/craft-agents-oss-theme.css";
import "../../../styles/craft-agents-oss-messages.css";

const modeLabel = CRAFT_PERMISSION_MODE_LABEL;
const modeOrder = CRAFT_PERMISSION_MODE_ORDER;
const suggestions = [
  "请帮我压缩这个 PDF 文件",
  "我想把这两个 PDF 文件合并",
  "帮我把这份文档转成 Markdown",
];

const { settings, loadSettings } = useProviderSettings();
const permissionMode = ref<CraftPermissionMode>("ask");
const {
  messages,
  turns,
  sessions,
  loading,
  error,
  send,
  clear,
  stop,
  pendingPermission,
  denyPermission,
  allowPermission,
} = useCraftAgentChat(() => settings.value, permissionMode);

const {
  chips: pendingChips,
  hasPending,
  addFile,
  addFolder,
  removeChip,
  takePending,
  clear: clearAttachments,
} = useAgentAttachments();

const input = ref("");
const activeSessionId = ref("current");
const permissionDetailsExpanded = ref(false);
const selectedActivity = shallowRef<CraftActivity | null>(null);
const chatScroll = ref<HTMLElement | null>(null);
const messageResetKey = ref(0);

const SCROLL_PIN_THRESHOLD_PX = 64;
const stickToBottom = ref(true);
let scrollPinRaf: number | null = null;

const elapsedSeconds = ref(0);
let timerId: number | null = null;

function syncStickToBottom() {
  const el = chatScroll.value;
  if (!el) return;
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_PIN_THRESHOLD_PX;
}

function scrollPinnedToBottom() {
  if (!stickToBottom.value) return;
  if (scrollPinRaf !== null) {
    cancelAnimationFrame(scrollPinRaf);
  }
  scrollPinRaf = requestAnimationFrame(() => {
    scrollPinRaf = null;
    const el = chatScroll.value;
    if (!el || !stickToBottom.value) return;
    el.scrollTop = el.scrollHeight;
  });
}

const lastUserTurn = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i];
    if (m.role === "user") {
      return m;
    }
  }
  return null;
});

const lastUserTurnContent = computed(() => lastUserTurn.value?.content || "");

const lastUserTurnAttachments = computed(() => {
  if (!lastUserTurn.value?.attachments) return [];
  return attachmentChips(lastUserTurn.value.attachments).map((c) => c.label);
});

watch(loading, (isLoading) => {
  if (isLoading) {
    elapsedSeconds.value = 0;
    if (timerId !== null) {
      window.clearInterval(timerId);
    }
    timerId = window.setInterval(() => {
      elapsedSeconds.value++;
    }, 1000);
  } else {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }
});

onBeforeUnmount(() => {
  if (timerId !== null) {
    window.clearInterval(timerId);
  }
  if (scrollPinRaf !== null) {
    cancelAnimationFrame(scrollPinRaf);
  }
});

const activeSession = computed(
  () => sessions.value.find((session) => session.id === activeSessionId.value) ?? sessions.value[0],
);

const canSend = computed(
  () =>
    !loading.value &&
    !pendingPermission.value &&
    (input.value.trim().length > 0 || hasPending.value),
);

const modelLabel = computed(() => settings.value.model.trim() || "未配置模型");

const pendingPermissionSummary = computed(() => {
  if (!pendingPermission.value) return null;
  return permissionSummary(pendingPermission.value.args);
});

const runningActivities = computed(() =>
  turns.value.flatMap((turn) =>
    turn.type === "assistant"
      ? turn.activities.filter(
          (activity) => activity.status === "running" || activity.status === "pending",
        )
      : [],
  ),
);

const activeAssistantTurns = computed(() =>
  turns.value.filter((turn) => turn.type === "assistant" && turn.phase !== "complete"),
);

const activeWorkCount = computed(
  () => runningActivities.value.length || activeAssistantTurns.value.length,
);

watch(
  () => [turns.value, pendingPermission.value, loading.value],
  () => {
    nextTick(scrollPinnedToBottom);
  },
);

watch(pendingPermission, (value) => {
  if (value) permissionDetailsExpanded.value = false;
});

watch(
  runningActivities,
  (activities) => {
    if (activities.length) selectedActivity.value = activities[activities.length - 1];
  },
  { deep: true },
);

onMounted(() => {
  loadSettings();
});

function pathBasename(path: unknown) {
  if (typeof path !== "string" || !path) return "";
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function permissionSummary(args: Record<string, unknown>) {
  const inputPath =
    (args.input_path as string) ||
    (Array.isArray(args.input_paths) ? (args.input_paths[0] as string) : undefined) ||
    (args.path as string) ||
    (args.src as string);
  const outputPath = (args.output_path as string) || (args.dest as string);
  const inputPaths = Array.isArray(args.input_paths)
    ? (args.input_paths as string[])
    : inputPath
      ? [inputPath]
      : [];
  return { inputPath, outputPath, inputPaths };
}

function permissionArgsPreview(args: Record<string, unknown>) {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

async function submitMessage() {
  if (!canSend.value) return;
  const text = input.value;
  const attachments = takePending();
  input.value = "";
  stickToBottom.value = true;
  await send(text, attachments);
  nextTick(scrollPinnedToBottom);
}

function onNewChat() {
  clear();
  clearAttachments();
  input.value = "";
  messageResetKey.value++;
  permissionDetailsExpanded.value = false;
  selectedActivity.value = null;
}

function stopProcessing() {
  stop();
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

function applySuggestion(text: string) {
  input.value = text;
}

function activityStatusLabel(status: CraftActivity["status"]) {
  switch (status) {
    case "pending":
      return "等待";
    case "running":
      return "执行中";
    case "success":
      return "完成";
    case "error":
      return "错误";
    default:
      return status;
  }
}

function activityKind(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("prepare") || name.includes("think")) return "think";
  if (name.includes("read") || name.includes("get_") || name.includes("info")) return "read";
  if (name.includes("search") || name.includes("hash")) return "search";
  if (
    name.includes("edit") ||
    name.includes("compress") ||
    name.includes("merge") ||
    name.includes("split") ||
    name.includes("convert") ||
    name.includes("rotate") ||
    name.includes("crop") ||
    name.includes("move") ||
    name.includes("copy")
  )
    return "edit";
  if (name.includes("file")) return "read";
  if (name.includes("bash") || name.includes("run") || name.includes("terminal")) return "terminal";
  if (name.includes("plan")) return "plan";
  if (name.includes("preview") || name.includes("markdown")) return "preview";
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

function getFileTypeAndIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "pdf":
      return { type: "PDF", icon: "i-lucide-file-text", class: "file-pdf" };
    case "md":
    case "markdown":
      return { type: "Markdown", icon: "i-lucide-file-code", class: "file-md" };
    case "html":
    case "htm":
      return { type: "HTML", icon: "i-lucide-file-code", class: "file-html" };
    case "doc":
    case "docx":
      return { type: "Word", icon: "i-lucide-file-text", class: "file-word" };
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return { type: "Image", icon: "i-lucide-image", class: "file-img" };
    default:
      return { type: ext.toUpperCase() || "FILE", icon: "i-lucide-file", class: "file-default" };
  }
}
</script>

<template>
  <section class="craft-demo" aria-label="DocPilot AI 助理">
    <aside class="craft-session-rail" aria-label="会话列表">
      <div class="craft-rail-header">
        <div class="craft-logo" aria-hidden="true">
          <span class="i-lucide-list-tree craft-logo-icon" />
        </div>
        <div>
          <p>AI 助理</p>
          <span>PDF 工具编排</span>
        </div>
        <button
          class="craft-icon-button"
          type="button"
          title="新建对话"
          aria-label="新建对话"
          @click="onNewChat"
        >
          <span class="i-lucide-plus craft-action-icon" aria-hidden="true" />
        </button>
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
        <span :class="['craft-pill', activeWorkCount ? 'is-info' : 'is-success']">
          {{ activeWorkCount ? `${activeWorkCount} 进行中` : "空闲" }}
        </span>
      </header>

      <div
        ref="chatScroll"
        class="craft-oss-app oss-chat-scroll craft-message-scroll"
        role="log"
        aria-live="polite"
        @scroll="syncStickToBottom"
      >
        <CraftOssMessageFlow
          :turns="turns"
          :loading="loading"
          :elapsed-seconds="elapsedSeconds"
          :selected-activity-id="selectedActivity?.id ?? null"
          :suggestions="suggestions"
          :reset-key="messageResetKey"
          empty-description="通过自然语言调用本地 PDF / 图片工具。可添加文件附件后描述需求。"
          @select-activity="selectedActivity = $event"
          @apply-suggestion="applySuggestion"
        />
      </div>

      <div v-if="error" role="alert" class="craft-error">{{ error }}</div>

      <div v-if="pendingPermission" class="craft-permission">
        <div class="craft-permission-card">
          <div class="craft-permission-head">
            <span
              :class="['craft-tool-shell', activityKind(pendingPermission.toolId)]"
              aria-hidden="true"
            >
              <span :class="['craft-tool-icon', activityIconClass(pendingPermission.toolId)]" />
            </span>
            <div class="craft-permission-title">
              <strong>工具执行确认</strong>
              <span>{{ pendingPermission.toolLabel }}</span>
            </div>
          </div>

          <dl v-if="pendingPermissionSummary" class="craft-permission-summary">
            <template v-if="pendingPermissionSummary.inputPaths.length === 1">
              <div>
                <dt>输入文件</dt>
                <dd>{{ pathBasename(pendingPermissionSummary.inputPath) }}</dd>
              </div>
            </template>
            <template v-else-if="pendingPermissionSummary.inputPaths.length > 1">
              <div>
                <dt>输入文件</dt>
                <dd>{{ pendingPermissionSummary.inputPaths.length }} 个文件</dd>
              </div>
            </template>
            <div v-if="pendingPermissionSummary.outputPath">
              <dt>输出路径</dt>
              <dd>{{ pathBasename(pendingPermissionSummary.outputPath) }}</dd>
            </div>
          </dl>

          <button
            class="craft-permission-toggle"
            type="button"
            :aria-expanded="permissionDetailsExpanded"
            @click="permissionDetailsExpanded = !permissionDetailsExpanded"
          >
            <span
              :class="[
                'i-lucide-chevron-right',
                'craft-chevron',
                permissionDetailsExpanded && 'is-open',
              ]"
              aria-hidden="true"
            />
            {{ permissionDetailsExpanded ? "收起参数详情" : "查看参数详情" }}
          </button>

          <pre v-if="permissionDetailsExpanded" class="craft-permission-pre">{{
            permissionArgsPreview(pendingPermission.args)
          }}</pre>
        </div>

        <div class="craft-permission-actions">
          <button type="button" @click="denyPermission">拒绝</button>
          <button type="button" @click="allowPermission(false)">允许一次</button>
          <button type="button" class="primary" @click="allowPermission(true)">始终允许</button>
        </div>
      </div>

      <div v-else-if="loading" class="craft-composer-running">
        <div v-if="lastUserTurnAttachments.length" class="craft-running-files-grid">
          <div v-for="file in lastUserTurnAttachments" :key="file" class="craft-attachment-card">
            <div :class="['craft-attachment-icon-wrapper', getFileTypeAndIcon(file).class]">
              <span :class="['craft-attachment-icon', getFileTypeAndIcon(file).icon]" />
            </div>
            <div class="craft-attachment-info">
              <span class="craft-attachment-name" :title="file">
                {{ file }}
              </span>
              <span class="craft-attachment-type">
                {{ getFileTypeAndIcon(file).type }}
              </span>
            </div>
          </div>
        </div>

        <div class="craft-running-query">
          {{ lastUserTurnContent }}
        </div>

        <div class="craft-running-bar">
          <div class="craft-running-status">
            <span class="i-lucide-grip-vertical craft-running-grip" aria-hidden="true" />
            <span class="craft-running-text">处理中…</span>
            <span class="craft-running-timer">{{ elapsedSeconds }}s</span>
          </div>
          <button
            class="craft-send is-stop"
            type="button"
            aria-label="停止"
            title="停止"
            @click="stopProcessing"
          >
            <span class="i-lucide-square craft-action-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      <form v-else class="craft-composer-wrap" @submit.prevent="submitMessage">
        <div class="craft-composer">
          <div v-if="pendingChips.length" class="craft-attachment-scroll">
            <div v-for="chip in pendingChips" :key="chip.path" class="craft-attachment-card">
              <div :class="['craft-attachment-icon-wrapper', getFileTypeAndIcon(chip.label).class]">
                <span :class="['craft-attachment-icon', getFileTypeAndIcon(chip.label).icon]" />
              </div>
              <div class="craft-attachment-info">
                <span class="craft-attachment-name" :title="chip.label">
                  {{ chip.label }}
                </span>
                <span class="craft-attachment-type">
                  {{ getFileTypeAndIcon(chip.label).type }}
                </span>
              </div>
              <button
                type="button"
                class="craft-attachment-close"
                :aria-label="`移除 ${chip.label}`"
                @click="removeChip(chip.path)"
              >
                <span class="i-lucide-x w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          </div>
          <textarea
            v-model="input"
            rows="3"
            placeholder="描述您想对 PDF 进行的操作…"
            :disabled="loading"
            @keydown="onTextareaKeydown"
          />
          <div class="craft-composer-bar">
            <div class="craft-composer-bar-left">
              <div class="craft-composer-attach-group" role="group" aria-label="添加附件">
                <button
                  type="button"
                  class="craft-icon-button is-framed"
                  aria-label="添加文件"
                  title="添加文件"
                  :disabled="loading"
                  @click="addFile"
                >
                  <span class="i-lucide-paperclip craft-action-icon" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="craft-icon-button is-framed"
                  aria-label="选择文件夹"
                  title="选择文件夹"
                  :disabled="loading"
                  @click="addFolder"
                >
                  <span class="i-lucide-folder-open craft-action-icon" aria-hidden="true" />
                </button>
              </div>
              <span v-if="pendingChips.length" class="craft-composer-file-count">
                <span class="i-lucide-files w-3.5 h-3.5" aria-hidden="true" />
                <span>{{ pendingChips.length }} 个文件</span>
              </span>
            </div>

            <div class="craft-composer-bar-right">
              <span class="craft-composer-model" :title="modelLabel">{{ modelLabel }}</span>
              <div class="craft-segmented" role="group" aria-label="权限模式">
                <button
                  v-for="mode in modeOrder"
                  :key="mode"
                  :class="['mode-btn', `mode-${mode}`, mode === permissionMode && 'is-selected']"
                  type="button"
                  @click="permissionMode = mode"
                >
                  {{ modeLabel[mode] }}
                </button>
              </div>
              <button class="craft-send" type="submit" aria-label="发送" :disabled="!canSend">
                <span class="i-lucide-arrow-up craft-action-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>

    <aside class="craft-inspector" aria-label="Craft activity detail">
      <div class="craft-inspector-head">
        <strong>活动详情</strong>
        <span :class="['craft-pill', activeWorkCount ? 'is-info' : 'is-success']">
          {{ activeWorkCount ? "进行中" : "空闲" }}
        </span>
      </div>
      <div v-if="!selectedActivity" class="craft-inspector-empty">
        <span class="i-lucide-mouse-pointer-click craft-inspector-empty-icon" aria-hidden="true" />
        <p>点击工具步骤查看输入与输出</p>
      </div>
      <div v-else class="craft-inspector-body">
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
              activityStatusLabel(selectedActivity.status)
            }}</span>
          </div>
        </div>
        <section>
          <label class="craft-inspector-label">说明</label>
          <pre>{{ selectedActivity.description || "无说明" }}</pre>
        </section>
        <section v-if="selectedActivity.input">
          <label class="craft-inspector-label">输入</label>
          <pre>{{ selectedActivity.input }}</pre>
        </section>
        <section v-if="selectedActivity.output">
          <label class="craft-inspector-label">输出</label>
          <pre>{{ selectedActivity.output }}</pre>
        </section>
      </div>
    </aside>
  </section>
</template>

<style scoped>
.craft-demo {
  display: grid;
  grid-template-columns: 13.5rem minmax(0, 1fr) 18rem;
  gap: 0.375rem;
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
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--dp-border);
  background: color-mix(in srgb, var(--dp-surface-muted) 80%, var(--dp-surface));
}

.craft-rail-header {
  justify-content: flex-start;
}

.craft-rail-header > .craft-icon-button {
  margin-left: auto;
}

.craft-rail-header p,
.craft-chat-header p {
  font-size: var(--dp-text-sm);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dp-text);
}

.craft-rail-header span,
.craft-chat-header span {
  font-size: var(--dp-text-xs);
  color: var(--dp-text-muted);
  line-height: var(--dp-leading-tight);
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

.craft-session-row {
  transition:
    background-color var(--dp-dur-fast) var(--dp-ease),
    box-shadow var(--dp-dur-fast) var(--dp-ease);
}

.craft-session-row:hover {
  background: var(--dp-surface-muted);
}

.craft-session-row.is-active {
  background: var(--dp-bg);
  box-shadow: inset 0 0 0 1px var(--dp-border-strong);
  color: var(--dp-text);
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
  background: color-mix(in srgb, var(--dp-primary) 55%, var(--dp-text-muted));
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
  border-radius: var(--dp-radius-sm);
  background: var(--dp-surface-muted);
  color: var(--dp-text-secondary);
  font-size: var(--dp-text-2xs);
  font-weight: 600;
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
  color: var(--dp-primary-hover);
  background: color-mix(in srgb, var(--dp-primary-soft) 70%, var(--dp-surface));
}

.craft-option.mode-safe {
  color: var(--dp-success);
  background: var(--dp-success-soft);
}

.craft-message-scroll {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  background: var(--dp-surface-muted);
}

.craft-error {
  margin: 0 0.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--dp-danger) 35%, var(--dp-border));
  border-radius: var(--dp-radius-md);
  background: var(--dp-danger-soft);
  color: var(--dp-danger);
  font-size: 0.8125rem;
}

.craft-attachment-scroll {
  display: flex;
  overflow-x: auto;
  gap: 0.625rem;
  padding: 0.25rem 0.25rem 0.625rem;
  margin-bottom: 0.25rem;
  scrollbar-width: thin;
}

.craft-attachment-scroll::-webkit-scrollbar {
  height: 4px;
}

.craft-attachment-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.craft-attachment-scroll::-webkit-scrollbar-thumb {
  background: var(--dp-border);
  border-radius: 99px;
}

.craft-attachment-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 0 0 13.5rem;
  width: 13.5rem;
  padding: 0.5rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-lg);
  background: var(--dp-surface);
  position: relative;
  transition:
    border-color var(--dp-dur-fast) var(--dp-ease),
    background-color var(--dp-dur-fast) var(--dp-ease);
}

.craft-attachment-card:hover {
  border-color: var(--dp-border-strong);
  background: var(--dp-surface-muted);
}

.craft-attachment-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--dp-radius-md);
  flex-shrink: 0;
  background: var(--dp-tool-bg);
  color: var(--dp-tool-fg);
}

.craft-attachment-icon-wrapper.file-pdf,
.craft-attachment-icon-wrapper.file-md,
.craft-attachment-icon-wrapper.file-word,
.craft-attachment-icon-wrapper.file-img,
.craft-attachment-icon-wrapper.file-html,
.craft-attachment-icon-wrapper.file-default {
  background: var(--dp-tool-bg);
  color: var(--dp-tool-fg);
}

.craft-attachment-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.craft-attachment-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.craft-attachment-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dp-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.craft-attachment-type {
  font-size: var(--dp-text-2xs);
  color: var(--dp-text-muted);
  font-weight: 500;
  margin-top: 0.125rem;
}

.craft-attachment-close {
  display: inline-grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 99px;
  color: var(--dp-text-muted);
  background: var(--dp-surface-muted);
  flex-shrink: 0;
  opacity: 0.7;
  transition:
    opacity var(--dp-dur-fast) ease,
    background var(--dp-dur-fast) ease,
    color var(--dp-dur-fast) ease;
}

.craft-attachment-close:hover {
  opacity: 1;
  background: var(--dp-danger-soft);
  color: var(--dp-danger);
}

.craft-attachment-close:focus-visible {
  box-shadow: var(--dp-ring);
}

.craft-composer-bar-left,
.craft-composer-bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.craft-composer-bar-right {
  flex-shrink: 0;
  margin-left: auto;
}

.craft-composer-attach-group {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
}

.craft-composer-file-count {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.85rem;
  padding: 0 0.55rem;
  border-radius: 99px;
  background: var(--dp-primary-soft);
  color: var(--dp-primary);
  font-size: 0.75rem;
  font-weight: 650;
  white-space: nowrap;
}

.craft-composer-model {
  display: none;
  max-width: 8rem;
  overflow: hidden;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
  color: var(--dp-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 720px) {
  .craft-composer-model {
    display: inline-block;
  }
}

.craft-chevron {
  width: 1rem;
  height: 1rem;
  transition: transform var(--dp-dur-fast) ease;
}

.craft-chevron.is-open {
  transform: rotate(90deg);
}

.craft-icon-button {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: var(--dp-radius-sm);
  color: var(--dp-text-muted);
  transition:
    background-color var(--dp-dur-fast) var(--dp-ease),
    color var(--dp-dur-fast) var(--dp-ease);
}

.craft-icon-button:hover:not(:disabled),
.craft-icon-button.is-framed {
  background: var(--dp-surface-muted);
  color: var(--dp-text);
}

.craft-icon-button:focus-visible {
  box-shadow: var(--dp-ring);
}

.craft-icon-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.craft-tool-shell {
  display: inline-grid;
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
  place-items: center;
  border: none;
  border-radius: var(--dp-radius-sm);
  background: var(--dp-tool-bg);
  color: var(--dp-tool-fg);
}

.craft-tool-shell.think,
.craft-tool-shell.agent,
.craft-tool-shell.search,
.craft-tool-shell.read,
.craft-tool-shell.terminal,
.craft-tool-shell.edit,
.craft-tool-shell.plan,
.craft-tool-shell.preview {
  background: var(--dp-tool-bg);
  color: var(--dp-tool-fg);
}

.craft-tool-icon {
  display: block;
  width: 0.875rem;
  height: 0.875rem;
}

.craft-permission-actions button,
.craft-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.35rem;
  padding: 0 0.75rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-primary);
  color: white;
  font-size: var(--dp-text-sm);
  font-weight: 600;
  transition:
    background-color var(--dp-dur-fast) var(--dp-ease),
    transform var(--dp-dur-fast) var(--dp-ease);
}

.craft-send:hover:not(:disabled) {
  background: var(--dp-primary-hover);
}

.craft-permission,
.craft-composer-wrap,
.craft-composer-running {
  flex: 0 0 auto;
  padding: 0.75rem;
  border-top: 1px solid var(--dp-border);
  background: var(--dp-surface);
}

.craft-composer-running {
  display: flex;
  flex-direction: column;
}

.craft-running-files-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  max-height: 14rem;
  overflow-y: auto;
  padding: 0.25rem 0.25rem 0.625rem;
  margin-bottom: 0.25rem;
  scrollbar-width: thin;
}

.craft-running-files-grid::-webkit-scrollbar {
  width: 4px;
}

.craft-running-files-grid::-webkit-scrollbar-track {
  background: transparent;
}

.craft-running-files-grid::-webkit-scrollbar-thumb {
  background: var(--dp-border);
  border-radius: 99px;
}

.craft-running-query {
  font-size: 0.875rem;
  color: var(--dp-text);
  line-height: 1.6;
  padding: 0.5rem 0.25rem;
  margin-bottom: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.craft-running-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px solid var(--dp-border);
}

.craft-running-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
}

.craft-running-text {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.craft-running-timer {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--dp-primary);
  font-variant-numeric: tabular-nums;
}

.craft-permission {
  display: grid;
  gap: 0.75rem;
}

.craft-permission-card {
  display: grid;
  gap: 0.625rem;
  padding: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--dp-accent) 28%, var(--dp-border));
  border-radius: var(--dp-radius-lg);
  background: color-mix(in srgb, var(--dp-accent-soft) 35%, var(--dp-surface));
}

.craft-permission-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.craft-permission-title {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.craft-permission-title strong {
  color: var(--dp-accent);
  font-size: 0.875rem;
}

.craft-permission-title span {
  color: var(--dp-text);
  font-size: 0.9375rem;
  font-weight: 700;
}

.craft-permission-summary {
  display: grid;
  gap: 0.35rem;
  margin: 0;
}

.craft-permission-summary > div {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 0.5rem;
  align-items: baseline;
}

.craft-permission-summary dt {
  margin: 0;
  color: var(--dp-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.craft-permission-summary dd {
  margin: 0;
  overflow: hidden;
  color: var(--dp-text);
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.craft-permission-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.85rem;
  padding: 0 0.35rem;
  color: var(--dp-text-secondary);
  font-size: 0.75rem;
  font-weight: 650;
}

.craft-permission-toggle:hover {
  color: var(--dp-text);
}

.craft-permission-pre {
  overflow: auto;
  max-height: 10rem;
  margin: 0;
  padding: 0.625rem;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
  color: var(--dp-text);
  font-size: 0.75rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
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
  border: 1px solid var(--dp-border);
}

.craft-permission-actions button:hover:not(:disabled) {
  background: var(--dp-surface-inset);
  color: var(--dp-text);
}

.craft-permission-actions button:focus-visible {
  box-shadow: var(--dp-ring);
}

.craft-permission-actions button.primary {
  background: var(--dp-primary);
  border-color: transparent;
  color: white;
}

.craft-permission-actions button.primary:hover:not(:disabled) {
  background: var(--dp-primary-hover);
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
}

.craft-composer textarea {
  display: block;
  width: 100%;
  min-height: 4.5rem;
  resize: vertical;
  padding: 0.45rem;
  outline: 0;
  border-radius: var(--dp-radius-sm);
  color: var(--dp-text);
  line-height: var(--dp-leading-normal);
  transition: box-shadow var(--dp-dur-fast) var(--dp-ease);
}

.craft-composer textarea:focus-visible {
  box-shadow: var(--dp-ring);
}

.craft-composer textarea::placeholder {
  color: var(--dp-text-muted);
}

.craft-composer-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.35rem;
}

.craft-segmented {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  min-height: 2.2rem;
  padding: 0.18rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
}

.craft-segmented .mode-btn {
  min-height: 1.85rem;
  min-width: 2.75rem;
  padding: 0 0.55rem;
  border-radius: var(--dp-radius-sm);
  color: var(--dp-text-secondary);
  font-size: var(--dp-text-xs);
  font-weight: 600;
  transition:
    background var(--dp-dur-fast) var(--dp-ease),
    color var(--dp-dur-fast) var(--dp-ease),
    box-shadow var(--dp-dur-fast) var(--dp-ease);
}

.craft-segmented .mode-btn:hover:not(.is-selected) {
  background: color-mix(in srgb, var(--dp-border) 40%, transparent);
  color: var(--dp-text);
}

.craft-segmented .mode-btn:focus-visible {
  box-shadow: var(--dp-ring);
}

.craft-segmented .mode-btn.is-selected {
  background: var(--dp-surface);
  color: var(--dp-text);
  box-shadow: inset 0 0 0 1px var(--dp-border);
}

.craft-segmented .mode-btn.mode-ask.is-selected {
  color: var(--dp-primary-hover);
}

.craft-segmented .mode-btn.mode-auto.is-selected {
  color: var(--dp-primary);
}

.craft-segmented .mode-btn.mode-safe.is-selected {
  color: var(--dp-success);
}

.craft-send {
  width: 2.35rem;
  padding: 0;
}

.craft-send:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  background: var(--dp-surface-inset);
  color: var(--dp-text-muted);
}

.craft-send:focus-visible {
  box-shadow: var(--dp-ring);
}

.craft-running-grip {
  width: 1rem;
  height: 1rem;
  color: var(--dp-text-muted);
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
  font-size: var(--dp-text-base);
  font-weight: 600;
}

.craft-inspector-empty {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  flex: 1;
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--dp-text-muted);
  font-size: var(--dp-text-xs);
  line-height: var(--dp-leading-relaxed);
}

.craft-inspector-empty-icon {
  width: 1.25rem;
  height: 1.25rem;
  opacity: 0.55;
}

.craft-inspector-label,
.craft-inspector label {
  color: var(--dp-text-muted);
  font-size: var(--dp-text-xs);
  font-weight: 600;
  letter-spacing: var(--dp-label-tracking);
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

@keyframes craft-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.82);
  }

  50% {
    opacity: 1;
    transform: scale(1);
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
    gap: 0.5rem;
  }

  .craft-composer-bar-left,
  .craft-composer-bar-right {
    width: 100%;
  }

  .craft-composer-bar-right {
    justify-content: space-between;
    margin-left: 0;
  }

  .craft-segmented {
    flex: 1;
    justify-content: center;
  }

  .craft-segmented .mode-btn {
    flex: 1;
  }
}
</style>
