<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { exportAiLogs, getAdminAiLogs } from '@/api/ai';
import { vDateGuard } from '@/utils/dateGuard';
import type { AiLogItem } from '@/types/ai';

// AI 对话记录查看(03-page-spec 4.8,FR-13 审计入口):按会话折叠 + mode 标签 + 来源 + 日期过滤 + JSONL 导出
const list = ref<AiLogItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dateRange = ref<[string, string] | null>(null);
const loading = ref(false);
const exporting = ref(false);

const filters = reactive({ sessionKey: '', startDate: '', endDate: '' });

/** 按会话折叠:同一 sessionKey 归为一组,组内按时间正序展示 user/assistant 交替 */
const sessions = computed(() => {
  const map = new Map<string, AiLogItem[]>();
  for (const item of list.value) {
    const arr = map.get(item.sessionKey) ?? [];
    arr.push(item);
    map.set(item.sessionKey, arr);
  }
  return [...map.entries()].map(([key, messages]) => ({
    key,
    messages: messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    mode: messages.find((m) => m.role === 'assistant')?.mode
  }));
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminAiLogs({
      sessionKey: filters.sessionKey || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      page: page.value,
      pageSize: pageSize.value
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  page.value = 1;
  void fetchList();
}

function onDateRangeChange(): void {
  filters.startDate = dateRange.value?.[0] ?? '';
  filters.endDate = dateRange.value?.[1] ?? '';
  onSearch();
}

async function onExport(): Promise<void> {
  exporting.value = true;
  try {
    // 导出文件含对话原文:提交前需脱敏,不入 git(03-page-spec 4.8)
    await exportAiLogs({ startDate: filters.startDate || undefined, endDate: filters.endDate || undefined });
    ElMessage.success('导出成功,已开始下载');
  } catch (err) {
    // 拦截器对 blob 请求不弹错,由这里给具体原因,确保导出失败不静默(D-MED-3)
    const message = (err as { message?: string }).message;
    ElMessage.error(message || '导出失败,请稍后重试');
  } finally {
    exporting.value = false;
  }
}

onMounted(fetchList);
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="page-head">
        <h2>AI 对话记录</h2>
        <p class="page-head__desc">
          审计学生端 AI 问答:按会话查看消息、模式与来源,支持导出 JSONL
        </p>
      </div>
      <el-button
        type="primary"
        :loading="exporting"
        data-testid="ai-log-export"
        @click="onExport"
      >
        导出 JSONL
      </el-button>
    </div>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="导出文件含对话原文,提交前需脱敏,不入 git(docs/ai-logs/exports/ 已被忽略)"
      class="toolbar__tip"
    />

    <div class="toolbar__filters">
      <el-input
        v-model="filters.sessionKey"
        placeholder="按会话 UUID 过滤"
        clearable
        class="toolbar__session"
        @keyup.enter="onSearch"
      />
      <!-- el-date-picker 根为 tooltip 组件,指令须挂真实 DOM 宿主才能捕获内层 input 事件(D-MED-2) -->
      <div
        v-date-guard
        class="date-guard-host"
      >
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="onDateRangeChange"
        />
      </div>
      <el-button
        @click="onSearch"
      >
        查询
      </el-button>
    </div>

    <div
      v-loading="loading"
      class="sessions"
    >
      <el-collapse v-if="sessions.length > 0">
        <el-collapse-item
          v-for="s in sessions"
          :key="s.key"
          :name="s.key"
        >
          <template #title>
            <span class="session-title">
              会话 {{ s.key.slice(0, 8) }}…（{{ s.messages.length }} 条）
              <el-tag
                v-if="s.mode === 'fallback'"
                type="warning"
                size="small"
              >fallback</el-tag>
              <el-tag
                v-else-if="s.mode === 'deepseek'"
                type="success"
                size="small"
              >deepseek</el-tag>
            </span>
          </template>
          <div
            v-for="m in s.messages"
            :key="m.id"
            class="msg"
            :class="`msg--${m.role}`"
          >
            <div class="msg__head">
              <el-tag
                :type="m.role === 'user' ? 'info' : 'primary'"
                size="small"
              >
                {{ m.role === 'user' ? '用户' : 'AI' }}
              </el-tag>
              <el-tag
                v-if="m.role === 'assistant' && m.mode"
                :type="m.mode === 'fallback' ? 'warning' : 'success'"
                size="small"
                effect="plain"
              >
                {{ m.mode }}
              </el-tag>
              <span
                v-if="m.role === 'assistant' && m.latencyMs != null"
                class="msg__latency"
              >耗时 {{ m.latencyMs }} ms</span>
              <span class="msg__time">{{ m.createdAt }}</span>
            </div>
            <div class="msg__content">
              {{ m.content }}
            </div>
            <div
              v-if="m.role === 'assistant' && m.sources.length > 0"
              class="msg__sources"
            >
              来源:<span
                v-for="(src, i) in m.sources"
                :key="i"
                class="msg__source"
              >[{{ i + 1 }}] {{ src.title }}（{{ src.type }}）</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
      <el-empty
        v-else
        description="暂无对话记录"
      />
    </div>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      background
      class="pager"
      @current-change="fetchList"
    />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.toolbar .page-head {
  margin-bottom: 0;
}
.toolbar__tip {
  margin-bottom: 16px;
}
.toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.toolbar__session {
  width: 320px;
}
.sessions {
  min-height: 120px;
}
.session-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.msg {
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--ssda-bg-page);
  border: 1px solid var(--ssda-border-color);
}
.msg--assistant {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-8);
}
.msg__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.msg__time {
  color: #909399;
  font-size: 12px;
}
.msg__latency {
  color: #909399;
  font-size: 12px;
}
.msg__content {
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.7;
}
.msg__sources {
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
}
.msg__source {
  display: inline-block;
  margin-right: 12px;
}
</style>
