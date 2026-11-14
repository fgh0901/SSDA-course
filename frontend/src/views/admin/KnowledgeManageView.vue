<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import {
  createKnowledge,
  deleteKnowledge,
  getAdminKnowledge,
  getKnowledgeChangeLogs,
  getAdminKnowledgeDetail,
  reviewKnowledge,
  submitReview,
  takedownKnowledge,
  updateKnowledge
} from '@/api/admin';
import { useCategoryStore } from '@/stores/category';
import StatusTag from '@/components/StatusTag.vue';
import { isDateString } from '@/utils/datetime';
import { vDateGuard } from '@/utils/dateGuard';
import { INVALID_DATE_MESSAGE } from '@/utils/knowledgeRules';
import type { KnowledgeChangeLog, KnowledgeItem } from '@/types/knowledge';
import type { KnowledgeStatus } from '@/types/api';
import {
  createKnowledgeRules,
  emptyKnowledgeForm,
  toKnowledgePayload,
  validateDateRange,
  type KnowledgeFormModel
} from '@/utils/knowledgeRules';

// 知识管理(03-page-spec 4.2):全状态筛选列表 + 新增/编辑表单(TC-08 校验)+ 审核/上下架 + 变更日志抽屉
const categoryStore = useCategoryStore();
const route = useRoute();
const router = useRouter();

// ---- 列表 ----
const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending_review' },
  { label: '已发布', value: 'published' },
  { label: '已下架', value: 'takedown' }
];

const list = ref<KnowledgeItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const statusFilter = ref('');
const loading = ref(false);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminKnowledge({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onStatusChange(): void {
  page.value = 1;
  void fetchList();
}

function onSearch(): void {
  page.value = 1;
  void fetchList();
}

// ---- 新增/编辑表单 ----
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);
const formRef = ref<FormInstance | null>(null);
const form = reactive<KnowledgeFormModel>(emptyKnowledgeForm());
const rules = createKnowledgeRules();

function openCreate(): void {
  editingId.value = null;
  Object.assign(form, emptyKnowledgeForm());
  dialogVisible.value = true;
}

async function openEditById(id: number): Promise<void> {
  editingId.value = id;
  const detail = await getAdminKnowledgeDetail(id); // 编辑回显(契约 3.3)
  Object.assign(form, {
    title: detail.title,
    categoryId: detail.categoryId,
    content: detail.content,
    source: detail.source,
    effectiveFrom: detail.effectiveFrom ?? '',
    effectiveUntil: detail.effectiveUntil ?? '',
    isVerified: detail.isVerified
  });
  dialogVisible.value = true;
}

async function openEdit(row: KnowledgeItem): Promise<void> {
  await openEditById(row.id);
}

async function onSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  const rangeError = validateDateRange(form);
  if (rangeError) {
    ElMessage.error(rangeError);
    return;
  }
  // 提交前真实日历兜底校验(GUI 验收 D-MED-2):model 值须为真实存在的日期
  if ((form.effectiveFrom && !isDateString(form.effectiveFrom)) || (form.effectiveUntil && !isDateString(form.effectiveUntil))) {
    ElMessage.error(INVALID_DATE_MESSAGE);
    return;
  }
  saving.value = true;
  try {
    const payload = toKnowledgePayload(form);
    if (editingId.value === null) {
      await createKnowledge(payload);
      ElMessage.success('已保存为草稿');
    } else {
      const result = await updateKnowledge(editingId.value, payload);
      ElMessage.success(result.status === 'draft' ? '已保存,状态回退为草稿(需重新提审)' : '已保存');
    }
    dialogVisible.value = false;
    void fetchList();
  } finally {
    saving.value = false;
  }
}

// ---- 状态流转操作(按当前状态显隐) ----
const operating = ref(false);

async function onSubmitReview(row: KnowledgeItem): Promise<void> {
  await ElMessageBox.confirm(`确认提交「${row.title}」进入审核？`, '提交审核', { type: 'info' });
  operating.value = true;
  try {
    await submitReview(row.id);
    ElMessage.success('已提交审核');
    void fetchList();
  } finally {
    operating.value = false;
  }
}

// ---- 审核对话框(pending_review → published/draft;驳回 comment 必填) ----
const reviewVisible = ref(false);
const reviewRow = ref<KnowledgeItem | null>(null);
const reviewAction = ref<'publish' | 'reject'>('publish');
const reviewComment = ref('');
const reviewSaving = ref(false);

function openReview(row: KnowledgeItem): void {
  reviewRow.value = row;
  reviewAction.value = 'publish';
  reviewComment.value = '';
  reviewVisible.value = true;
}

async function onReview(): Promise<void> {
  if (!reviewRow.value) return;
  if (reviewAction.value === 'reject') {
    if (!reviewComment.value.trim()) {
      ElMessage.error('驳回原因不能为空');
      return;
    }
    if (reviewComment.value.length > 200) {
      ElMessage.error('驳回原因不能超过 200 字');
      return;
    }
  }
  reviewSaving.value = true;
  try {
    await reviewKnowledge(reviewRow.value.id, reviewAction.value, reviewComment.value.trim() || undefined);
    ElMessage.success(reviewAction.value === 'publish' ? '审核通过并发布' : '已驳回');
    reviewVisible.value = false;
    void fetchList();
  } finally {
    reviewSaving.value = false;
  }
}

async function onTakedown(row: KnowledgeItem): Promise<void> {
  await ElMessageBox.confirm(`确认下架「${row.title}」？下架后学生端立即不可见。`, '下架确认', { type: 'warning' });
  operating.value = true;
  try {
    await takedownKnowledge(row.id);
    ElMessage.success('已下架');
    void fetchList();
  } finally {
    operating.value = false;
  }
}

async function onDelete(row: KnowledgeItem): Promise<void> {
  await ElMessageBox.confirm(`确认删除「${row.title}」？仅草稿可删除,删除后不可恢复。`, '删除确认', { type: 'warning' });
  try {
    await deleteKnowledge(row.id); // 409 时拦截器已展示后端 message(如"仅草稿状态的知识可删除")
    ElMessage.success('已删除');
    void fetchList();
  } catch {
    // 保持列表状态不变,错误提示由拦截器统一处理
  }
}

// ---- 变更日志抽屉(契约 3.11) ----
const logsVisible = ref(false);
const logs = ref<KnowledgeChangeLog[]>([]);
const logsLoading = ref(false);

async function openLogs(row: KnowledgeItem): Promise<void> {
  logsVisible.value = true;
  logsLoading.value = true;
  try {
    const data = await getKnowledgeChangeLogs(row.id, { page: 1, pageSize: 50 });
    logs.value = data.list;
  } finally {
    logsLoading.value = false;
  }
}

const ACTION_LABEL: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  submit_review: '提交审核',
  review_publish: '审核通过',
  review_reject: '审核驳回',
  takedown: '下架'
};

onMounted(async () => {
  void categoryStore.fetchOnce();
  await fetchList();
  // 过期工作台"核实更新"直达编辑(规格 4.3):读取 ?edit=<id> 自动打开编辑弹窗,随后清除 query 防刷新复触发
  const editId = Number(route.query.edit);
  if (Number.isInteger(editId) && editId > 0) {
    router.replace({ query: { ...route.query, edit: undefined } });
    try {
      await openEditById(editId);
    } catch {
      // 详情不存在(如已被删除):错误提示由拦截器统一处理,保持列表态
    }
  }
});
</script>

<template>
  <div>
    <div class="page-head">
      <h1>知识管理</h1>
      <p class="page-head__desc">
        维护知识条目的新增、编辑、审核与上下架;学生端仅展示已发布内容
      </p>
    </div>
    <div class="toolbar">
      <el-tabs
        v-model="statusFilter"
        class="toolbar__tabs"
        @tab-change="onStatusChange"
      >
        <el-tab-pane
          v-for="t in STATUS_TABS"
          :key="t.value || 'all'"
          :label="t.label"
          :name="t.value"
        />
      </el-tabs>
      <div class="toolbar__actions">
        <el-input
          v-model="keyword"
          placeholder="按标题搜索"
          clearable
          class="toolbar__keyword"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新增知识
        </el-button>
      </div>
    </div>

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
        prop="categoryName"
        label="分类"
        width="110"
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
        label="核实"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.isVerified === 0"
            type="warning"
            size="small"
            effect="plain"
          >
            待核实
          </el-tag>
          <span
            v-else
            class="verified-ok"
          >已核实</span>
        </template>
      </el-table-column>
      <el-table-column
        label="有效期"
        width="200"
      >
        <template #default="{ row }">
          {{ row.effectiveFrom || '—' }} 至 {{ row.effectiveUntil || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="updatedAt"
        label="更新时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="300"
      >
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'draft' || row.status === 'takedown'"
            link
            type="primary"
            @click="onSubmitReview(row)"
          >
            提交审核
          </el-button>
          <el-button
            v-if="row.status === 'pending_review'"
            link
            type="success"
            @click="openReview(row)"
          >
            审核
          </el-button>
          <el-button
            v-if="row.status === 'published'"
            link
            type="warning"
            @click="onTakedown(row)"
          >
            下架
          </el-button>
          <el-button
            v-if="row.status === 'draft'"
            link
            type="danger"
            @click="onDelete(row)"
          >
            删除
          </el-button>
          <el-button
            link
            type="info"
            @click="openLogs(row)"
          >
            日志
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无知识,可调整筛选条件或新增" />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      background
      class="pager"
      @current-change="fetchList"
    />

    <!-- 新增/编辑表单(TC-08:标题/分类/正文/来源必填,日期格式校验) -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId === null ? '新增知识' : '编辑知识'"
      width="640px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="96px"
      >
        <el-form-item
          label="标题"
          prop="title"
        >
          <el-input
            v-model="form.title"
            maxlength="100"
            data-testid="form-title"
          />
        </el-form-item>
        <el-form-item
          label="分类"
          prop="categoryId"
        >
          <el-select
            v-model="form.categoryId"
            placeholder="请选择分类"
            data-testid="form-category"
          >
            <el-option
              v-for="c in categoryStore.enabledList"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="正文"
          prop="content"
        >
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            maxlength="20000"
            show-word-limit
            data-testid="form-content"
          />
        </el-form-item>
        <el-form-item
          label="来源"
          prop="source"
        >
          <el-input
            v-model="form.source"
            maxlength="200"
            placeholder="如:校信息化办公室官网"
            data-testid="form-source"
          />
        </el-form-item>
        <el-form-item
          label="有效期起"
          prop="effectiveFrom"
        >
          <!-- el-date-picker 根为 tooltip 组件,指令须挂真实 DOM 宿主才能捕获内层 input 事件(D-MED-2) -->
          <div
            v-date-guard
            class="date-guard-host"
          >
            <el-date-picker
              v-model="form.effectiveFrom"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="YYYY-MM-DD"
            />
          </div>
        </el-form-item>
        <el-form-item
          label="有效期止"
          prop="effectiveUntil"
        >
          <div
            v-date-guard
            class="date-guard-host"
          >
            <el-date-picker
              v-model="form.effectiveUntil"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="可选,不早于有效期起"
            />
          </div>
        </el-form-item>
        <el-form-item label="核实状态">
          <el-switch
            v-model="form.isVerified"
            :active-value="1"
            :inactive-value="0"
            active-text="已核实"
            inactive-text="待核实"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          data-testid="form-save"
          @click="onSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="reviewVisible"
      title="知识审核"
      width="480px"
    >
      <el-radio-group v-model="reviewAction">
        <el-radio value="publish">
          通过并发布
        </el-radio>
        <el-radio value="reject">
          驳回
        </el-radio>
      </el-radio-group>
      <el-input
        v-if="reviewAction === 'reject'"
        v-model="reviewComment"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        placeholder="驳回原因(必填,1~200 字)"
        class="review-comment"
      />
      <template #footer>
        <el-button @click="reviewVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="reviewSaving"
          @click="onReview"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 变更日志抽屉 -->
    <el-drawer
      v-model="logsVisible"
      title="修改日志"
      size="40%"
    >
      <div v-loading="logsLoading">
        <el-timeline v-if="logs.length > 0">
          <el-timeline-item
            v-for="log in logs"
            :key="log.id"
            :timestamp="log.createdAt"
            :type="log.action === 'review_reject' || log.action === 'takedown' ? 'warning' : 'primary'"
          >
            <div>{{ ACTION_LABEL[log.action] ?? log.action }} · {{ log.adminUsername }}</div>
            <div class="log-detail">
              {{ log.detail }}
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty
          v-else
          description="暂无修改日志"
        />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.toolbar__tabs {
  flex: 1;
}
.toolbar__actions {
  display: flex;
  gap: 8px;
}
.toolbar__keyword {
  width: 220px;
}
.verified-ok {
  font-size: 12px;
  color: #909399;
}
.review-comment {
  margin-top: 12px;
}
.log-detail {
  color: #909399;
  font-size: 12px;
}
</style>
