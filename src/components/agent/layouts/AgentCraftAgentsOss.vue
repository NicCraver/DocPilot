<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import "../../../styles/craft-agents-oss-theme.css";
import "../../../styles/craft-agents-oss-messages.css";
import CraftOssMessageFlow from "../CraftOssMessageFlow.vue";
import {
  CRAFT_OSS_PERMISSION_ICON,
  CRAFT_OSS_PERMISSION_LABEL,
  CRAFT_OSS_PERMISSION_SHORT,
  CRAFT_OSS_TODO_STATES,
  useCraftAgentsOssMock,
  type CraftOssSession,
  type CraftOssTodoState,
} from "../../../composables/useCraftAgentsOssMock";
import type { CraftActivity } from "../../../composables/useCraftAgentChat";

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
  toggleRightSidebar,
  sendMessage,
  stopSimulation,
  disposeSimulation,
  acceptPlan,
  cycleTodoState,
  elapsedSeconds,
  demoCatalog,
} = useCraftAgentsOssMock();

const chatScroll = ref<HTMLElement | null>(null);

const allChatsExpanded = ref(true);

const todoStateMap = Object.fromEntries(CRAFT_OSS_TODO_STATES.map((s) => [s.id, s]));

const activeTodoState = computed(
  () => todoStateMap[activeSession.value.todoState] ?? CRAFT_OSS_TODO_STATES[1],
);

const openStatuses = CRAFT_OSS_TODO_STATES.filter((s) => s.category === "open");

const isProcessing = computed(() => activeSession.value.isProcessing ?? false);

const composerPlaceholder = computed(() => {
  if (isProcessing.value) return "按 ⌘ + . 进入专注模式";
  if (permissionMode.value === "allow-all") return "输入 @ 提及文件、文件夹或技能";
  if (activeSession.value.lastMessageRole === "plan") return "想做什么？";
  return "使用 Shift + Tab 切换探索和执行模式";
});

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

        <button class="oss-nav-link is-disabled" type="button" disabled title="演示占位">
          <span class="i-lucide-plug" aria-hidden="true" />
          数据源
        </button>
        <button class="oss-nav-link is-disabled" type="button" disabled title="演示占位">
          <span class="i-lucide-graduation-cap" aria-hidden="true" />
          技能
        </button>
        <button class="oss-nav-link is-disabled" type="button" disabled title="演示占位">
          <span class="i-lucide-settings" aria-hidden="true" />
          设置
        </button>

        <div class="oss-nav-divider" />

        <div class="oss-nav-group">
          <p class="oss-nav-group-label">状态演示</p>
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
          <span>会话</span>
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
                <button
                  class="oss-session-btn"
                  type="button"
                  :title="`${session.name} — ${session.preview}`"
                  @click="selectSession(session.id)"
                >
                  <div class="oss-session-title">
                    <span
                      :class="session.isProcessing && 'animate-shimmer-text'"
                      :title="session.name"
                    >
                      {{ session.name }}
                    </span>
                  </div>
                  <div class="oss-session-sub">
                    <div class="oss-session-meta">
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
                    </div>
                    <span class="oss-session-preview" :title="session.preview">{{
                      session.preview
                    }}</span>
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
          <CraftOssMessageFlow
            :turns="turns"
            :loading="isProcessing"
            :elapsed-seconds="elapsedSeconds"
            :selected-activity-id="selectedActivityId"
            :queued-message="activeSession.queuedMessage"
            :show-accept-plan="activeSession.lastMessageRole === 'plan'"
            :reset-key="activeSessionId"
            empty-description="发送消息将触发 LLM 循环模拟，或点击下方状态 demo 查看预设会话。"
            @select-activity="selectActivity"
            @accept-plan="acceptPlan"
          >
            <template #empty-footer>
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
            </template>
          </CraftOssMessageFlow>
        </div>

        <div v-if="activeSession.pendingPermission" class="oss-input-area">
          <div class="oss-structured shadow-middle">
            <div class="oss-structured-head">
              <span class="oss-act-icon kind-edit">
                <span class="i-lucide-notebook-pen" aria-hidden="true" />
              </span>
              <div>
                <strong>允许执行此工具？</strong>
                <span>{{ activeSession.pendingPermission.toolLabel }}</span>
              </div>
            </div>
            <p>{{ activeSession.pendingPermission.summary }}</p>
            <pre>{{ activeSession.pendingPermission.argsPreview }}</pre>
            <div class="oss-structured-actions">
              <button type="button">拒绝</button>
              <button type="button">允许一次</button>
              <button type="button" class="is-accent">始终允许</button>
            </div>
          </div>
        </div>

        <form
          v-else
          class="oss-input-area"
          @submit.prevent="isProcessing ? stopSimulation() : submitMessage()"
        >
          <div class="oss-composer-toolbar">
            <div class="oss-composer-toolbar-left">
              <button
                :class="[
                  'oss-mode-chip',
                  modeBadgeClass(permissionMode),
                  modeTintClass(permissionMode),
                ]"
                type="button"
                :disabled="isProcessing"
                @click="cyclePermissionMode"
              >
                <span :class="CRAFT_OSS_PERMISSION_ICON[permissionMode]" aria-hidden="true" />
                {{ CRAFT_OSS_PERMISSION_LABEL[permissionMode] }}
                <span class="i-lucide-chevron-down" aria-hidden="true" />
              </button>
              <button class="oss-todo-chip" type="button" @click="cycleTodoState">
                <span :class="activeTodoState.icon" aria-hidden="true" />
                {{ activeTodoState.label }}
                <span class="i-lucide-chevron-down" aria-hidden="true" />
              </button>
            </div>
            <button class="oss-info-btn" type="button" title="详情面板" @click="toggleRightSidebar">
              <span class="i-lucide-info" aria-hidden="true" />
              信息
            </button>
          </div>

          <div class="oss-composer shadow-middle">
            <textarea
              v-model="input"
              rows="3"
              :placeholder="composerPlaceholder"
              :readonly="isProcessing"
              @keydown="onTextareaKeydown"
            />
            <div class="oss-composer-bar">
              <div class="oss-composer-left">
                <button
                  class="oss-icon-btn"
                  type="button"
                  title="Attach file"
                  :disabled="isProcessing"
                >
                  <span class="i-lucide-paperclip" aria-hidden="true" />
                </button>
                <button class="oss-icon-btn" type="button" title="Sources" :disabled="isProcessing">
                  <span class="i-lucide-database-zap" aria-hidden="true" />
                </button>
                <span v-if="activeSession.workspaceId" class="oss-workspace-pill">
                  <span class="i-lucide-hexagon" aria-hidden="true" />
                  {{ activeSession.workspaceId }}
                </span>
              </div>
              <div class="oss-composer-right">
                <span class="oss-model">{{ activeSession.model }}</span>
                <button
                  v-if="isProcessing"
                  class="oss-stop-btn"
                  type="button"
                  aria-label="停止"
                  @click="stopSimulation"
                >
                  <span class="i-lucide-square" aria-hidden="true" />
                </button>
                <button v-else class="oss-send-btn" type="submit" :disabled="!input.trim()">
                  <span class="i-lucide-arrow-up" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>

      <!-- Right sidebar (RightSidebar / Inspector) -->
      <aside v-if="rightSidebarOpen" class="oss-panel oss-right shadow-middle">
        <header class="oss-panel-header">
          <span>详情</span>
        </header>
        <div class="oss-right-body">
          <section class="oss-demo-meta">
            <label>演示状态</label>
            <span class="oss-demo-badge">{{ activeSession.demoLabel }}</span>
            <p>
              {{
                demoCatalog.find((d) => d.sessionId === activeSessionId)?.hint ??
                activeSession.demoLabel
              }}
            </p>
          </section>

          <section>
            <label>状态</label>
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
            <label>当前活动</label>
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
  border-radius: var(--dp-radius-sm);
  font-size: var(--dp-text-sm);
  color: var(--foreground);
  text-align: left;
  transition:
    background-color var(--dp-dur-fast) var(--dp-ease),
    color var(--dp-dur-fast) var(--dp-ease);
}

.oss-nav-link:hover:not(:disabled):not(.is-active) {
  background: var(--foreground-2);
}

.oss-nav-link.is-active {
  background: var(--dp-bg);
  color: var(--dp-text);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px var(--dp-border-strong);
}

.oss-nav-link.is-disabled,
.oss-nav-link:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.oss-nav-link:focus-visible {
  box-shadow: var(--dp-ring);
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
  font-size: var(--dp-text-2xs);
  font-weight: 600;
  letter-spacing: var(--dp-label-tracking);
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

.oss-inbox {
  min-width: 0;
}

.oss-inbox-scroll,
.oss-chat-scroll,
.oss-right-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
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
  min-width: 0;
  margin-right: 0.5rem;
}

.oss-session-item.is-selected .oss-session-btn {
  background: var(--dp-bg);
  box-shadow: inset 0 0 0 1px var(--dp-border-strong);
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem 1rem 0.75rem 2rem;
  border-radius: 8px;
  text-align: left;
  overflow: hidden;
  transition: background-color 75ms;
}

.oss-session-btn:hover {
  background: var(--foreground-2);
}

.oss-session-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oss-session-sub {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  font-size: 12px;
  color: var(--foreground-70);
}

.oss-session-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.oss-session-preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.oss-input-area {
  padding: 0 1.25rem 1rem;
}

.oss-composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.oss-composer-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.oss-todo-chip,
.oss-info-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 1.5rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
  background: var(--foreground-5);
}

.oss-info-btn {
  margin-left: auto;
  border-radius: 8px;
  height: 1.65rem;
  color: var(--muted-foreground);
}

.oss-info-btn:hover,
.oss-todo-chip:hover {
  background: var(--foreground-2);
  color: var(--foreground);
}

.oss-composer {
  border-radius: 16px;
  background: var(--background);
  overflow: hidden;
  transition:
    box-shadow var(--dp-dur-fast) var(--dp-ease),
    border-color var(--dp-dur-fast) var(--dp-ease);
}

.oss-composer:focus-within {
  box-shadow: var(--dp-ring);
  border-color: color-mix(in srgb, var(--dp-primary) 40%, var(--dp-border));
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
  font-size: var(--dp-text-sm);
  line-height: var(--dp-leading-normal);
  color: var(--foreground);
  border-radius: var(--dp-radius-sm);
  transition: box-shadow var(--dp-dur-fast) var(--dp-ease);
}

.oss-composer textarea:focus-visible {
  box-shadow: none;
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

.oss-composer-left,
.oss-composer-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.oss-composer-right {
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.oss-workspace-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 9rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  background: var(--foreground-5);
  font-size: 10px;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oss-model {
  font-size: 10px;
  color: var(--muted-foreground);
  flex-shrink: 0;
  padding-right: 0.15rem;
}

.oss-send-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--dp-radius-md);
  background: var(--accent);
  color: white;
}

.oss-send-btn:hover:not(:disabled) {
  background: var(--dp-primary-hover);
}

.oss-send-btn:focus-visible {
  box-shadow: var(--dp-ring);
}

.oss-send-btn:disabled {
  opacity: 0.38;
  background: var(--dp-surface-inset);
  color: var(--dp-text-muted);
}

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
  border-radius: var(--dp-radius-sm);
  border: 1px solid var(--dp-border);
  font-size: var(--dp-text-xs);
  font-weight: 600;
  background: var(--dp-surface-muted);
  color: var(--dp-text-secondary);
}

.oss-structured-actions button:hover:not(:disabled) {
  background: var(--dp-surface-inset);
  color: var(--dp-text);
}

.oss-structured-actions button:focus-visible {
  box-shadow: var(--dp-ring);
}

.oss-structured-actions .is-accent {
  background: var(--accent);
  border-color: transparent;
  color: white;
}

.oss-structured-actions .is-accent:hover:not(:disabled) {
  background: var(--dp-primary-hover);
}

.oss-stop-btn {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--dp-radius-md);
  background: var(--dp-danger-soft);
  color: var(--dp-danger);
}

.oss-stop-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dp-danger) 12%, var(--dp-danger-soft));
}

.oss-stop-btn:focus-visible {
  box-shadow: var(--dp-ring);
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
  font-size: var(--dp-text-xs);
  font-weight: 600;
  letter-spacing: var(--dp-label-tracking);
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
