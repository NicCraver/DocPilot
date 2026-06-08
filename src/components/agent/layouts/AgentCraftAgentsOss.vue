<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import "../../../styles/craft-agents-oss-theme.css";
import AgentMarkdown from "../AgentMarkdown.vue";
import {
  CRAFT_OSS_PERMISSION_LABEL,
  CRAFT_OSS_PERMISSION_ORDER,
  CRAFT_OSS_PERMISSION_SHORT,
  CRAFT_OSS_TODO_STATES,
  useCraftAgentsOssMock,
  type CraftOssSession,
  type CraftOssTodoState,
} from "../../../composables/useCraftAgentsOssMock";
import type { CraftAssistantTurn, CraftActivity } from "../../../composables/useCraftAgentChat";

const ACTIVITY_LIMIT = 5;

const {
  activeSession,
  activeSessionId,
  groupedSessions,
  turns,
  permissionMode,
  navFilter,
  rightSidebarOpen,
  selectedActivityId,
  selectedActivity,
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
  demoCatalog,
} = useCraftAgentsOssMock();

const chatScroll = ref<HTMLElement | null>(null);

const expandedActivityLists = ref<Record<string, boolean>>({});
const copiedTurnId = ref<string | null>(null);
const allChatsExpanded = ref(true);

const todoStateMap = Object.fromEntries(CRAFT_OSS_TODO_STATES.map((s) => [s.id, s]));

const activeTodoState = computed(
  () => todoStateMap[activeSession.value.todoState] ?? CRAFT_OSS_TODO_STATES[1],
);

const openStatuses = CRAFT_OSS_TODO_STATES.filter((s) => s.category === "open");

function previewText(turn: CraftAssistantTurn) {
  const running = turn.activities.find((a) => a.status === "running");
  if (running) return running.description || running.title;
  const pending = turn.activities.find((a) => a.status === "pending");
  if (pending) return `Waiting: ${pending.title}`;
  if (turn.phase === "pending") return "Thinking...";
  if (turn.phase === "awaiting") return "Preparing response...";
  if (turn.phase === "streaming") return "Writing response...";
  if (turn.interrupted) return "Stopped";
  return turn.title || "Turn complete";
}

function thinkingText(turn: CraftAssistantTurn) {
  if (turn.phase === "streaming") return "Preparing response...";
  if (turn.activities.length) return "Preparing response...";
  return "Thinking...";
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

function modeBadgeClass(mode: CraftOssSession["permissionMode"]) {
  if (mode === "safe") return "badge-explore";
  if (mode === "ask") return "badge-ask";
  return "badge-auto";
}

function modeTintClass(mode: CraftOssSession["permissionMode"]) {
  if (mode === "safe") return "shadow-tinted-safe";
  if (mode === "ask") return "shadow-tinted-ask";
  return "shadow-tinted-auto";
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

function onTextareaKeydown(event: KeyboardEvent) {
  if (event.key === "Tab" && event.shiftKey) {
    event.preventDefault();
    cyclePermissionMode();
    return;
  }
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void sendMessage();
  }
}

function submitMessage() {
  void sendMessage();
}

watch(
  () => [turns.value, activeSession.value.isProcessing],
  () => {
    nextTick(() => {
      const el = chatScroll.value;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  },
  { deep: true },
);

onBeforeUnmount(() => {
  disposeSimulation();
});

async function copyTurn(turn: CraftAssistantTurn) {
  try {
    await navigator.clipboard.writeText(turn.response || previewText(turn));
  } catch {
    // mock
  }
  copiedTurnId.value = turn.id;
  window.setTimeout(() => {
    if (copiedTurnId.value === turn.id) copiedTurnId.value = null;
  }, 1500);
}

function selectActivity(activity: CraftActivity) {
  selectedActivityId.value = activity.id;
}
</script>

<template>
  <div class="craft-oss-app oss-root">
    <div class="oss-shell">
      <!-- Left navigation (LeftSidebar) -->
      <nav class="oss-panel oss-nav" aria-label="Workspace navigation">
        <button class="oss-workspace" type="button">
          <span class="oss-workspace-avatar">P</span>
          <span class="oss-workspace-text">
            <strong>Personal</strong>
            <small>Default workspace</small>
          </span>
          <span class="i-lucide-chevrons-up-down oss-workspace-chevron" aria-hidden="true" />
        </button>

        <button class="oss-nav-link is-default" type="button" @click="selectSession('new-session')">
          <span class="i-lucide-square-pen" aria-hidden="true" />
          New Chat
        </button>

        <div class="oss-nav-group">
          <button
            class="oss-nav-link is-expandable"
            type="button"
            @click="allChatsExpanded = !allChatsExpanded"
          >
            <span
              :class="['i-lucide-chevron-right', 'oss-nav-chevron', allChatsExpanded && 'is-open']"
              aria-hidden="true"
            />
            <span class="i-lucide-inbox" aria-hidden="true" />
            All Chats
          </button>
          <div v-if="allChatsExpanded" class="oss-nav-nested">
            <button
              :class="['oss-nav-link is-sub', navFilter === 'all' && 'is-active']"
              type="button"
              @click="setNavFilter('all')"
            >
              All
            </button>
            <button
              v-for="state in openStatuses"
              :key="state.id"
              :class="['oss-nav-link is-sub', navFilter === state.id && 'is-active']"
              type="button"
              @click="setNavFilter(state.id as CraftOssTodoState)"
            >
              <span :class="state.icon" aria-hidden="true" />
              {{ state.label }}
            </button>
          </div>
        </div>

        <button
          :class="['oss-nav-link', navFilter === 'flagged' && 'is-active']"
          type="button"
          @click="setNavFilter('flagged')"
        >
          <span class="i-lucide-flag" aria-hidden="true" />
          Flagged
        </button>

        <div class="oss-nav-divider" />

        <button class="oss-nav-link" type="button">
          <span class="i-lucide-plug" aria-hidden="true" />
          Sources
        </button>
        <button class="oss-nav-link" type="button">
          <span class="i-lucide-graduation-cap" aria-hidden="true" />
          Skills
        </button>
        <button class="oss-nav-link" type="button">
          <span class="i-lucide-settings" aria-hidden="true" />
          Settings
        </button>

        <div class="oss-nav-divider" />

        <div class="oss-nav-group">
          <p class="oss-nav-group-label">State demos</p>
          <button
            v-for="demo in demoCatalog"
            :key="demo.sessionId"
            :class="['oss-nav-link is-sub', activeSessionId === demo.sessionId && 'is-active']"
            type="button"
            :title="demo.hint"
            @click="selectSession(demo.sessionId)"
          >
            {{ demo.label }}
          </button>
        </div>
      </nav>

      <!-- Session inbox (SessionList) -->
      <aside class="oss-panel oss-inbox" aria-label="Sessions">
        <header class="oss-panel-header">
          <span>Chats</span>
        </header>

        <div class="oss-inbox-scroll">
          <section v-for="group in groupedSessions" :key="group.label" class="oss-date-group">
            <h3>{{ group.label }}</h3>
            <div v-for="(session, index) in group.items" :key="session.id" class="oss-session-wrap">
              <div v-if="index > 0" class="oss-session-sep" />
              <div :class="['oss-session-item', session.id === activeSessionId && 'is-selected']">
                <button
                  class="oss-todo-btn"
                  type="button"
                  :title="todoStateMap[session.todoState]?.label"
                >
                  <span
                    :class="['oss-todo-icon', todoStateMap[session.todoState]?.colorClass]"
                    aria-hidden="true"
                  >
                    <span :class="todoStateMap[session.todoState]?.icon" />
                  </span>
                </button>
                <button class="oss-session-btn" type="button" @click="selectSession(session.id)">
                  <div class="oss-session-title">
                    <span :class="session.isProcessing && 'animate-shimmer-text'">
                      {{ session.name }}
                    </span>
                  </div>
                  <div class="oss-session-sub">
                    <span v-if="session.isProcessing" class="spinner-grid" aria-hidden="true">
                      <span /><span /><span /><span /><span /><span /><span /><span /><span />
                    </span>
                    <span v-else-if="session.isUnread" class="oss-pill oss-pill-new">New</span>
                    <span
                      v-if="session.isFlagged"
                      class="i-lucide-flag oss-flag-icon"
                      aria-label="Flagged"
                    />
                    <span v-if="session.lastMessageRole === 'plan'" class="oss-pill oss-pill-plan"
                      >Plan</span
                    >
                    <span :class="['oss-pill', modeBadgeClass(session.permissionMode)]">
                      {{ CRAFT_OSS_PERMISSION_SHORT[session.permissionMode] }}
                    </span>
                    <span class="oss-session-preview">{{ session.preview }}</span>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <!-- Main chat (ChatDisplay) -->
      <main class="oss-panel oss-chat shadow-middle">
        <header class="oss-panel-header oss-chat-header">
          <div class="oss-chat-title">
            <span :class="['oss-todo-icon', activeTodoState.colorClass]" aria-hidden="true">
              <span :class="activeTodoState.icon" />
            </span>
            <strong>{{ activeSession.name }}</strong>
          </div>
          <div class="oss-chat-actions">
            <button
              class="oss-icon-btn"
              type="button"
              title="Toggle right panel"
              @click="toggleRightSidebar"
            >
              <span class="i-lucide-panel-right" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div ref="chatScroll" class="oss-chat-scroll">
          <div v-if="!turns.length" class="oss-empty">
            <h2>What can I help you with?</h2>
            <p>发送消息将触发 LLM 循环模拟，或点击下方状态 demo 查看预设会话。</p>
            <div class="oss-demo-grid">
              <button
                v-for="demo in demoCatalog.filter((d) => d.state !== 'empty')"
                :key="demo.sessionId"
                type="button"
                class="oss-demo-card shadow-minimal"
                @click="selectSession(demo.sessionId)"
              >
                <strong>{{ demo.label }}</strong>
                <span>{{ demo.hint }}</span>
              </button>
            </div>
          </div>

          <div v-else class="oss-turns">
            <template v-for="turn in turns" :key="turn.id">
              <div v-if="turn.type === 'user'" class="oss-user">
                <div v-if="turn.attachments?.length" class="oss-user-files">
                  <div
                    v-for="file in turn.attachments"
                    :key="file"
                    class="oss-file-card shadow-minimal"
                  >
                    <span class="i-lucide-file-text" aria-hidden="true" />
                    <span>{{ file }}</span>
                  </div>
                </div>
                <div class="oss-user-bubble">{{ turn.content }}</div>
              </div>

              <section v-else class="oss-assistant">
                <div
                  v-if="turn.activities.length || turn.showThinkingIndicator"
                  class="oss-turn-card"
                >
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
                      <span v-if="activity.elapsed" class="oss-act-elapsed">{{
                        activity.elapsed
                      }}</span>
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
                    <div v-if="turn.showThinkingIndicator" class="oss-thinking">
                      <span class="oss-status-dot running" />
                      <span class="oss-thinking-dot" />
                      <span>{{ thinkingText(turn) }}</span>
                    </div>
                  </div>
                </div>

                <article
                  v-if="turn.response"
                  :class="['oss-response shadow-minimal', turn.interrupted && 'is-stopped']"
                >
                  <header class="oss-response-head">
                    <span>Response</span>
                    <span v-if="turn.streaming" class="oss-response-tag">Streaming</span>
                    <span v-else-if="turn.interrupted" class="oss-response-tag is-error"
                      >Stopped</span
                    >
                    <button
                      v-if="
                        activeSession.lastMessageRole === 'plan' &&
                        turn.id === turns[turns.length - 1]?.id
                      "
                      class="oss-accept-plan"
                      type="button"
                    >
                      Accept Plan
                    </button>
                  </header>
                  <div class="oss-response-body">
                    <AgentMarkdown :content="turn.response" :streaming="turn.streaming" />
                  </div>
                </article>
              </section>
            </template>
          </div>
        </div>

        <div v-if="activeSession.pendingPermission" class="oss-input-area">
          <div class="oss-structured shadow-middle">
            <div class="oss-structured-head">
              <span class="oss-act-icon kind-edit">
                <span class="i-lucide-notebook-pen" aria-hidden="true" />
              </span>
              <div>
                <strong>Allow this tool?</strong>
                <span>{{ activeSession.pendingPermission.toolLabel }}</span>
              </div>
            </div>
            <p>{{ activeSession.pendingPermission.summary }}</p>
            <pre>{{ activeSession.pendingPermission.argsPreview }}</pre>
            <div class="oss-structured-actions">
              <button type="button">Deny</button>
              <button type="button">Allow once</button>
              <button type="button" class="is-accent">Always allow</button>
            </div>
          </div>
        </div>

        <div v-else-if="activeSession.isProcessing" class="oss-input-area">
          <div class="oss-running shadow-middle">
            <span class="spinner-grid" aria-hidden="true">
              <span /><span /><span /><span /><span /><span /><span /><span /><span />
            </span>
            <span>Working…</span>
            <button class="oss-stop-btn" type="button" aria-label="Stop" @click="stopSimulation">
              <span class="i-lucide-square" aria-hidden="true" />
            </button>
          </div>
        </div>

        <form v-else class="oss-input-area" @submit.prevent="submitMessage">
          <div class="oss-composer shadow-middle">
            <div class="oss-composer-top">
              <button
                :class="[
                  'oss-mode-chip',
                  modeBadgeClass(permissionMode),
                  modeTintClass(permissionMode),
                ]"
                type="button"
                @click="cyclePermissionMode"
              >
                <span class="i-lucide-compass" aria-hidden="true" />
                {{ CRAFT_OSS_PERMISSION_LABEL[permissionMode] }}
                <span class="i-lucide-chevron-down" aria-hidden="true" />
              </button>
            </div>
            <textarea
              v-model="input"
              rows="3"
              placeholder="Message Craft Agent…"
              @keydown="onTextareaKeydown"
            />
            <div class="oss-composer-bar">
              <div class="oss-composer-left">
                <button class="oss-icon-btn" type="button" title="Attach file">
                  <span class="i-lucide-paperclip" aria-hidden="true" />
                </button>
                <button class="oss-icon-btn" type="button" title="Sources">
                  <span class="i-lucide-database-zap" aria-hidden="true" />
                </button>
                <span class="oss-model">{{ activeSession.model }}</span>
              </div>
              <button class="oss-send-btn" type="submit" :disabled="!input.trim()">
                <span class="i-lucide-arrow-up" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </main>

      <!-- Right sidebar (RightSidebar / Inspector) -->
      <aside v-if="rightSidebarOpen" class="oss-panel oss-right shadow-middle">
        <header class="oss-panel-header">
          <span>Details</span>
        </header>
        <div class="oss-right-body">
          <section class="oss-demo-meta">
            <label>Demo state</label>
            <span class="oss-demo-badge">{{ activeSession.demoLabel }}</span>
            <p>
              {{
                demoCatalog.find((d) => d.sessionId === activeSessionId)?.hint ??
                activeSession.demoLabel
              }}
            </p>
          </section>

          <section>
            <label>Status</label>
            <span :class="['oss-pill', activeTodoState.colorClass]">
              {{ activeTodoState.label }}
            </span>
          </section>
          <section v-if="activeSession.notes">
            <label>Notes</label>
            <p>{{ activeSession.notes }}</p>
          </section>
          <section v-if="activeSession.files?.length">
            <label>Files</label>
            <ul>
              <li v-for="file in activeSession.files" :key="file">{{ file }}</li>
            </ul>
          </section>
          <section v-if="selectedActivity">
            <label>Selected activity</label>
            <p class="oss-right-title">{{ selectedActivity.title }}</p>
            <p v-if="selectedActivity.description" class="oss-right-muted">
              {{ selectedActivity.description }}
            </p>
            <pre v-if="selectedActivity.output" class="oss-right-error">{{
              selectedActivity.output
            }}</pre>
          </section>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.oss-root {
  height: 100%;
  min-height: 0;
}

.oss-shell {
  display: grid;
  grid-template-columns: 13.75rem 18.75rem minmax(0, 1fr) 18.75rem;
  gap: var(--shell-gap);
  height: 100%;
  min-height: 0;
  padding: var(--shell-pad);
}

.oss-panel {
  min-height: 0;
  background: var(--background);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.oss-nav {
  border-top-left-radius: 14px;
  border-bottom-left-radius: 14px;
  padding: 0.5rem;
}

.oss-chat,
.oss-right {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

.oss-workspace {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.5rem;
  margin-bottom: 0.35rem;
  border-radius: 8px;
  text-align: left;
}

.oss-workspace:hover {
  background: var(--foreground-2);
}

.oss-workspace-avatar {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  background: var(--foreground-5);
  font-size: 11px;
  font-weight: 700;
}

.oss-workspace-text {
  flex: 1;
  min-width: 0;
}

.oss-workspace-text strong {
  display: block;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oss-workspace-text small {
  display: block;
  font-size: 11px;
  color: var(--muted-foreground);
}

.oss-workspace-chevron {
  width: 0.9rem;
  height: 0.9rem;
  color: var(--muted-foreground);
}

.oss-nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 1.875rem;
  padding: 0.4375rem 0.5rem;
  border-radius: 6px;
  font-size: 13px;
  color: var(--foreground);
  text-align: left;
  transition: background-color 75ms;
}

.oss-nav-link:hover,
.oss-nav-link.is-active {
  background: var(--foreground-2);
}

.oss-nav-link.is-default {
  font-weight: 600;
  background: var(--foreground-5);
}

.oss-nav-link.is-sub {
  padding-left: 1.75rem;
  font-size: 12px;
}

.oss-nav-chevron {
  width: 0.75rem;
  height: 0.75rem;
  transition: transform 0.15s ease;
}

.oss-nav-chevron.is-open {
  transform: rotate(90deg);
}

.oss-nav-nested {
  display: grid;
}

.oss-nav-divider {
  height: 1px;
  margin: 0.35rem 0.5rem;
  background: var(--border);
}

.oss-nav-group-label {
  padding: 0.35rem 0.5rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.oss-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 0 0.75rem;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  background: var(--background);
}

.oss-inbox-scroll,
.oss-chat-scroll,
.oss-right-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.oss-date-group h3 {
  padding: 0.5rem 0.75rem 0.25rem;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted-foreground);
}

.oss-session-wrap {
  padding: 0 0.5rem;
}

.oss-session-sep {
  height: 1px;
  margin: 0 0.75rem 0 3rem;
  background: var(--border);
}

.oss-session-item {
  position: relative;
  display: flex;
  margin-right: 0.5rem;
}

.oss-session-item.is-selected .oss-session-btn {
  background: var(--foreground-5);
}

.oss-todo-btn {
  position: absolute;
  left: 1rem;
  top: 0.875rem;
  z-index: 1;
  width: 1rem;
  height: 1rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
}

.oss-todo-btn:hover {
  background: var(--foreground-5);
}

.oss-todo-icon {
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
}

.oss-todo-icon.is-muted {
  color: var(--muted-foreground);
}
.oss-todo-icon.is-info {
  color: var(--info);
}
.oss-todo-icon.is-accent {
  color: var(--accent);
}

.oss-session-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem 1rem 0.75rem 2rem;
  border-radius: 8px;
  text-align: left;
  transition: background-color 75ms;
}

.oss-session-btn:hover {
  background: var(--foreground-2);
}

.oss-session-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  padding-right: 1.5rem;
}

.oss-session-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  font-size: 12px;
  color: var(--foreground-70);
  padding-right: 1.5rem;
}

.oss-session-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.oss-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.oss-pill-new {
  background: var(--accent);
  color: white;
}

.oss-pill-plan {
  background: color-mix(in oklch, var(--success) 10%, var(--background));
  color: var(--success);
}

.badge-explore {
  background: var(--foreground-5);
  color: var(--foreground-60);
}

.badge-ask {
  background: color-mix(in oklch, var(--info) 10%, var(--background));
  color: var(--info);
}

.badge-auto {
  background: color-mix(in oklch, var(--accent) 10%, var(--background));
  color: var(--accent);
}

.oss-flag-icon {
  width: 10px;
  height: 10px;
  color: var(--info);
  fill: var(--info);
  flex-shrink: 0;
}

.oss-chat-header {
  justify-content: space-between;
}

.oss-chat-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.oss-chat-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.oss-icon-btn {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  color: var(--muted-foreground);
}

.oss-icon-btn:hover {
  background: var(--foreground-5);
  color: var(--foreground);
}

.oss-chat-scroll {
  padding: 2rem 1.25rem 1rem;
}

.oss-turns {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  max-width: 52.5rem;
  margin: 0 auto;
}

.oss-empty {
  max-width: 28rem;
  margin: 3rem auto;
  text-align: center;
}

.oss-empty h2 {
  font-size: 1.125rem;
  font-weight: 600;
}

.oss-empty p {
  margin-top: 0.5rem;
  font-size: 13px;
  color: var(--muted-foreground);
}

.oss-demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
  text-align: left;
}

.oss-demo-card {
  display: grid;
  gap: 0.25rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: var(--background);
  text-align: left;
  transition: background-color 75ms;
}

.oss-demo-card:hover {
  background: var(--foreground-2);
}

.oss-demo-card strong {
  font-size: 12px;
  font-weight: 600;
}

.oss-demo-card span {
  font-size: 11px;
  color: var(--muted-foreground);
  line-height: 1.4;
}

.oss-demo-meta .oss-demo-badge {
  display: inline-flex;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in oklch, var(--accent) 10%, var(--background));
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
}

.oss-demo-meta p {
  margin-top: 0.35rem;
  color: var(--muted-foreground);
}

.oss-user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
}

.oss-user-files {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.oss-file-card {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  background: var(--background);
  font-size: 12px;
}

.oss-user-bubble {
  max-width: 80%;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  background: var(--foreground-5);
  font-size: 13px;
  line-height: 1.55;
}

.oss-turn-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.oss-turn-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  font-size: 13px;
  color: var(--muted-foreground);
  text-align: left;
}

.oss-chevron {
  width: 0.75rem;
  height: 0.75rem;
  transition: transform 0.15s;
}

.oss-chevron.is-open {
  transform: rotate(90deg);
}

.oss-turn-count {
  display: inline-grid;
  place-items: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.2rem;
  border-radius: 999px;
  background: var(--foreground-5);
  font-size: 10px;
  font-weight: 600;
}

.oss-turn-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oss-activities {
  padding: 0.25rem 0 0.25rem 1.15rem;
}

.oss-activity {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  width: 100%;
  min-height: 1.5rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 13px;
  text-align: left;
}

.oss-activity:hover,
.oss-activity.is-selected {
  background: var(--foreground-2);
}

.oss-status-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--muted-foreground);
  flex-shrink: 0;
}

.oss-status-dot.running {
  background: var(--info);
}
.oss-status-dot.pending {
  background: var(--muted-foreground);
}
.oss-status-dot.success {
  background: var(--success);
}
.oss-status-dot.error {
  background: var(--destructive);
}

.oss-act-icon {
  display: grid;
  place-items: center;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 4px;
  flex-shrink: 0;
  font-size: 11px;
}

.kind-think {
  color: var(--accent);
}
.kind-read {
  color: #2563eb;
}
.kind-search {
  color: #0284c7;
}
.kind-edit {
  color: var(--info);
}
.kind-terminal {
  color: var(--foreground-70);
}
.kind-plan {
  color: var(--success);
}
.kind-agent {
  color: var(--accent);
}

.oss-act-title {
  font-weight: 500;
}

.oss-act-muted,
.oss-act-elapsed {
  color: var(--muted-foreground);
  font-size: 12px;
}

.oss-act-more {
  padding: 0.15rem 0.35rem;
  font-size: 12px;
  color: var(--muted-foreground);
}

.oss-thinking {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.35rem;
  font-size: 12px;
  color: var(--muted-foreground);
}

.oss-thinking-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: var(--info);
  animation: craft-oss-pulse 1.2s ease-in-out infinite;
}

@keyframes craft-oss-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

.oss-response {
  margin-top: 0.35rem;
  border-radius: 8px;
  background: var(--background);
  max-height: 33.75rem;
  overflow: hidden;
}

.oss-response-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
}

.oss-response-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--info);
}

.oss-response-tag.is-error {
  color: var(--destructive);
}

.oss-accept-plan {
  margin-left: auto;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: var(--success);
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.oss-response-body {
  padding: 0.65rem 0.75rem;
  font-size: 13px;
  line-height: 1.55;
  overflow: auto;
}

.oss-input-area {
  padding: 0 1.25rem 1rem;
}

.oss-composer {
  border-radius: 16px;
  background: var(--background);
  overflow: hidden;
}

.oss-composer-top {
  padding: 0.5rem 0.65rem 0;
}

.oss-mode-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 1.5rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.oss-composer textarea {
  width: 100%;
  min-height: 4.5rem;
  padding: 0.65rem;
  border: 0;
  resize: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--foreground);
}

.oss-composer textarea::placeholder {
  color: var(--muted-foreground);
}

.oss-composer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.5rem 0.5rem;
  border-top: 1px solid color-mix(in oklch, var(--foreground) 5%, transparent);
}

.oss-composer-left {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.oss-model {
  margin-left: 0.35rem;
  font-size: 10px;
  color: var(--muted-foreground);
}

.oss-send-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--accent);
  color: white;
}

.oss-send-btn:disabled {
  opacity: 0.35;
}

.oss-running,
.oss-structured {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: var(--background);
}

.oss-structured {
  flex-direction: column;
  align-items: stretch;
}

.oss-structured-head {
  display: flex;
  gap: 0.5rem;
}

.oss-structured-head strong {
  display: block;
  font-size: 13px;
}

.oss-structured-head span {
  font-size: 11px;
  color: var(--muted-foreground);
}

.oss-structured pre {
  padding: 0.5rem;
  border-radius: 8px;
  background: var(--foreground-2);
  font-size: 11px;
  overflow: auto;
}

.oss-structured-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}

.oss-structured-actions button {
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.oss-structured-actions .is-accent {
  background: var(--accent);
  color: white;
}

.oss-stop-btn {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--foreground-5);
}

.oss-right-body {
  padding: 0.75rem;
}

.oss-right-body section {
  margin-bottom: 0.85rem;
}

.oss-right-body label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.oss-right-body p,
.oss-right-body li {
  font-size: 12px;
  line-height: 1.5;
}

.oss-right-body ul {
  display: grid;
  gap: 0.25rem;
}

.oss-right-title {
  font-weight: 600;
}

.oss-right-muted {
  color: var(--muted-foreground);
}

.oss-right-error {
  margin-top: 0.35rem;
  padding: 0.45rem;
  border-radius: 8px;
  background: var(--foreground-2);
  color: var(--destructive);
  font-size: 11px;
  white-space: pre-wrap;
}

@media (max-width: 1100px) {
  .oss-shell {
    grid-template-columns: 12rem 16rem minmax(0, 1fr);
  }
  .oss-right {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-shimmer-text,
  .oss-thinking-dot,
  .spinner-grid span {
    animation: none;
  }
}
</style>
