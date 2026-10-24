<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { aiChat, ensureAiSessionId } from '@/api/ai';
import type { AiSource } from '@/types/ai';
import type { SourceType } from '@/types/api';

// AI 助手对话页(03-page-spec 3.9,FR-13):
// - 首次进入生成 crypto.randomUUID() 存 localStorage.ssda_ai_session_id(契约 4.3,匿名,不收集身份信息)
// - mode=fallback 回答顶部降级提示条;sources 渲染可点击来源;sources=[] 回答原样展示(禁止编造)
// - 发送中 loading 防重复;400 展示 error.message
// - 对话历史按 sessionId 持久化到 localStorage(GUI 验收 D-MED-1,前端侧修复,不加后端接口):
//   key `ssda_ai_history_<sessionId>`,上限最近 50 条;离开页面再返回自动恢复;"清空对话"同步清除
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: AiSource[];
  mode?: 'deepseek' | 'fallback';
  failed?: boolean;
}

const HISTORY_LIMIT = 50;
const WELCOME_MESSAGE = '你好！我是新生校园知识库助手,可以回答校园知识、办事指南、活动与课程教师相关问题。AI 回答仅供参考,请以官方通知核实。';

// messages 只存真实对话(欢迎语静态渲染,不入历史,避免恢复时重复)
const messages = ref<ChatMessage[]>([]);
const input = ref('');
const sending = ref(false);
const sessionId = ensureAiSessionId();
const listRef = ref<HTMLElement | null>(null);
const historyKey = `ssda_ai_history_${sessionId}`;

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(historyKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          typeof m === 'object' &&
          ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') &&
          typeof (m as ChatMessage).content === 'string'
      )
      .slice(-HISTORY_LIMIT);
  } catch {
    return []; // 历史数据损坏时不阻塞页面,视为无历史
  }
}

/** 持久化真实对话,仅保留最近 HISTORY_LIMIT 条 */
function saveHistory(): void {
  try {
    localStorage.setItem(historyKey, JSON.stringify(messages.value.slice(-HISTORY_LIMIT)));
  } catch {
    // localStorage 配额/不可用等异常静默,不影响对话本身
  }
}

/** 清空对话:同时清除 localStorage 历史(GUI 验收 D-MED-1) */
function onClear(): void {
  messages.value = [];
  localStorage.removeItem(historyKey);
  scrollToBottom();
}

const SOURCE_PATH: Record<SourceType, (id: number) => string> = {
  knowledge: (id) => `/knowledge/${id}`,
  service: (id) => `/services/${id}`,
  activity: (id) => `/activities/${id}`,
  course: () => '/courses-teachers',
  teacher: () => '/courses-teachers',
  location: () => '/locations'
};

function scrollToBottom(): void {
  void nextTick(() => {
    listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' });
  });
}

async function onSend(): Promise<void> {
  const text = input.value.trim();
  if (!text) {
    return; // 空消息不发请求
  }
  if (sending.value) {
    return; // 发送中防重复
  }
  if (text.length > 500) {
    messages.value.push({ role: 'assistant', content: '问题长度须为 1~500 字', failed: true });
    return;
  }

  messages.value.push({ role: 'user', content: text });
  input.value = '';
  saveHistory();
  scrollToBottom();
  sending.value = true;
  try {
    const data = await aiChat({ sessionId, message: text }); // 已解包
    messages.value.push({
      role: 'assistant',
      content: data.answer, // sources=[] 时 answer 为"知识库未覆盖…"话术,原样展示
      sources: data.sources,
      mode: data.mode
    });
    saveHistory();
  } catch (err) {
    const message = (err as { message?: string }).message ?? '系统繁忙,请稍后重试';
    messages.value.push({ role: 'assistant', content: message, failed: true });
    saveHistory();
  } finally {
    sending.value = false;
    scrollToBottom();
  }
}

onMounted(() => {
  messages.value = loadHistory();
  scrollToBottom();
});
</script>

<template>
  <div class="ai-chat">
    <div class="ai-chat__head">
      <h1>AI 助手</h1>
      <el-button
        size="small"
        data-testid="ai-clear"
        @click="onClear"
      >
        清空对话
      </el-button>
    </div>
    <p class="ai-chat__notice">
      回答基于校内知识库检索生成,附来源列表;仅供参考,请核实。本对话仅以匿名会话号记录,不收集任何个人身份信息。
    </p>

    <div
      ref="listRef"
      class="ai-chat__list"
      data-testid="ai-message-list"
    >
      <div class="ai-chat__row ai-chat__row--assistant">
        <div class="ai-chat__bubble">
          {{ WELCOME_MESSAGE }}
        </div>
      </div>
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="ai-chat__row"
        :class="`ai-chat__row--${m.role}`"
      >
        <div
          class="ai-chat__bubble"
          :class="{ 'ai-chat__bubble--failed': m.failed }"
        >
          <el-alert
            v-if="m.role === 'assistant' && m.mode === 'fallback'"
            type="warning"
            :closable="false"
            title="当前为降级模式,回答由本地知识库检索直接整理,请以官方通知为准"
            class="ai-chat__fallback"
            data-testid="ai-fallback-tip"
          />
          <div
            class="ai-chat__content"
            data-testid="ai-message-content"
          >
            {{ m.content }}
          </div>
          <div
            v-if="m.sources && m.sources.length > 0"
            class="ai-chat__sources"
            data-testid="ai-sources"
          >
            <div class="ai-chat__sources-title">
              来源
            </div>
            <template
              v-for="(s, si) in m.sources"
              :key="`${s.type}-${s.id}-${si}`"
            >
              <router-link
                :to="SOURCE_PATH[s.type](s.id)"
                class="ai-chat__source-item"
              >
                [{{ si + 1 }}] {{ s.title }}
              </router-link>
            </template>
          </div>
        </div>
      </div>
      <div
        v-if="sending"
        class="ai-chat__row ai-chat__row--assistant"
      >
        <div
          class="ai-chat__bubble"
          data-testid="ai-loading"
        >
          正在检索知识库并生成回答…
        </div>
      </div>
    </div>

    <div class="ai-chat__input">
      <el-input
        v-model="input"
        type="textarea"
        :rows="3"
        maxlength="500"
        show-word-limit
        placeholder="请输入你的问题,如:校园卡丢了怎么补办？"
        data-testid="ai-input"
        @keydown.enter.exact.prevent="onSend"
      />
      <el-button
        type="primary"
        :loading="sending"
        :disabled="sending || !input.trim()"
        data-testid="ai-send"
        @click="onSend"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.ai-chat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.ai-chat__head h1 {
  margin: 0;
}
.ai-chat__notice {
  margin: 0 0 16px;
  color: #909399;
  font-size: 13px;
  line-height: 1.7;
}
.ai-chat__list {
  height: 52vh;
  overflow-y: auto;
  padding: 20px;
  background: var(--ssda-bg-page);
  border: 1px solid #eef1f6;
  border-radius: var(--ssda-radius-card);
  margin-bottom: 16px;
}
.ai-chat__row {
  display: flex;
  margin-bottom: 16px;
}
.ai-chat__row--user {
  justify-content: flex-end;
}
.ai-chat__bubble {
  max-width: 78%;
  background: #fff;
  border: 1px solid #eef1f6;
  border-radius: 12px;
  border-top-left-radius: 4px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.7;
  box-shadow: var(--ssda-shadow-1);
}
.ai-chat__row--user .ai-chat__bubble {
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-dark-2));
  color: #fff;
  border-color: transparent;
  border-radius: 12px;
  border-top-right-radius: 4px;
}
.ai-chat__bubble--failed {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-8);
}
.ai-chat__fallback {
  margin-bottom: 8px;
}
.ai-chat__content {
  white-space: pre-wrap;
}
.ai-chat__sources {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e4e9f2;
  font-size: 12px;
}
.ai-chat__sources-title {
  margin-bottom: 6px;
  color: #909399;
}
.ai-chat__source-item {
  display: inline-block;
  margin: 0 8px 6px 0;
  padding: 3px 10px;
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  color: var(--el-color-primary);
  text-decoration: none;
  transition: background 0.2s ease;
}
.ai-chat__source-item:hover {
  background: var(--el-color-primary-light-8);
}
.ai-chat__input {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
</style>
