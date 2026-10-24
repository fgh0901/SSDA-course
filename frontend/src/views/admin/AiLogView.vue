<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { exportAiLogs, getAdminAiLogs } from '@/api/ai';
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
    ElMessage.success('已导出 JSONL 文件');
  } catch {
    ElMessage.error('导出失败,请稍后重试');
  } finally {
    exporting.value = false;
  }
}

onMounted(fetchList);
</script>

<template>
  <div>
    <div class="toolbar">
      <h2>AI 对话记录</h2>
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
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="onDateRangeChange"
      />
      <el-button
        type="primary"
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
              会话 {{ s.key.slice(0, 8) }}…({{ s.messages.length }} 条)
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
              >耗时 {{ m.latencyMs }}ms</span>
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
              >[{{ i + 1 }}] {{ src.title }}({{ src.type }})</span>
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
  margin-bottom: 8px;
}
.toolbar h2 {
  margin: 0;
}
.toolbar__tip {
  margin-bottom: 12px;
}
.toolbar__filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
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
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #f5f7fa;
}
.msg--assistant {
  background: #ecf5ff;
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
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
