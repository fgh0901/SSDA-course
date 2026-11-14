<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getExpiredKnowledge, takedownKnowledge } from '@/api/admin';
import StatusTag from '@/components/StatusTag.vue';
import type { ExpiredKnowledgeItem } from '@/types/knowledge';
import type { KnowledgeStatus } from '@/types/api';

// 过期信息工作台(03-page-spec 4.3,P05):
// 系统仅按有效期识别,处理结果以人工核实为准;Tab 已过期/7 天内临期;操作:核实更新(跳编辑)/下架
const router = useRouter();
const state = ref<'expired' | 'expiring'>('expired');
const list = ref<ExpiredKnowledgeItem[]>([]);
const total = ref(0);
const page = ref(1);
const days = ref(7);
const loading = ref(false);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getExpiredKnowledge({
      state: state.value,
      days: days.value,
      page: page.value,
      pageSize: 10
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onTabChange(): void {
  page.value = 1;
  void fetchList();
}

function onEdit(row: ExpiredKnowledgeItem): void {
  // 核实更新:跳知识管理并带 edit 参数直达该条编辑弹窗(规格 4.3);编辑保存后 published 自动回退草稿重新审核(P04 红线)
  router.push({ path: '/admin/knowledge', query: { edit: String(row.id) } });
  ElMessage.info(`正在打开「${row.title}」编辑弹窗,保存后请重新提交审核`);
}

async function onTakedown(row: ExpiredKnowledgeItem): Promise<void> {
  await ElMessageBox.confirm(
    `确认下架「${row.title}」？下架后学生端立即不可见。`,
    '下架确认',
    { type: 'warning' }
  );
  await takedownKnowledge(row.id);
  ElMessage.success('已下架,学生端即时不可见');
  void fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div>
    <div class="page-head">
      <h2>过期信息工作台</h2>
      <p class="page-head__desc">
        集中处理已过期与临期知识,支持核实更新与下架,处理后学生端即时生效
      </p>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="系统仅按有效期字段识别过期/临期,处理结果以人工核实为准（未经核实不得自动标记真实有效）"
      class="p05-tip"
    />

    <el-tabs
      v-model="state"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="已过期"
        name="expired"
      />
      <el-tab-pane
        label="7 天内临期"
        name="expiring"
      />
    </el-tabs>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="id"
        label="ID"
        width="64"
      />
      <el-table-column
        prop="title"
        label="标题"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <StatusTag :status="row.status as KnowledgeStatus" />
        </template>
      </el-table-column>
      <el-table-column
        prop="effectiveUntil"
        label="有效期至"
        width="130"
      />
      <el-table-column
        label="识别结果"
        width="130"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.state === 'expired'"
            type="danger"
            size="small"
          >
            已过期 {{ row.daysOverdue ?? 0 }} 天
          </el-tag>
          <el-tag
            v-else
            type="warning"
            size="small"
          >
            {{ days }} 天内临期
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="updatedAt"
        label="更新时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="160"
      >
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            @click="onEdit(row)"
          >
            核实更新
          </el-button>
          <el-button
            link
            type="warning"
            @click="onTakedown(row)"
          >
            下架
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无过期/临期信息" />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      layout="total, prev, pager, next"
      background
      class="pager"
      @current-change="fetchList"
    />
  </div>
</template>

<style scoped>
.p05-tip {
  margin-bottom: 16px;
}
</style>
