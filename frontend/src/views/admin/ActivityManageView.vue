<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormItemRule } from 'element-plus';
import { createActivity, deleteActivity, getAdminActivityDetail, getAdminActivities, updateActivity } from '@/api/admin';
import { getLocations } from '@/api/locations';
import { isDateTimeString } from '@/utils/datetime';
import { vDateGuard } from '@/utils/dateGuard';
import { INVALID_DATE_MESSAGE } from '@/utils/knowledgeRules';
import type { ActivityItem } from '@/types/activity';

// 活动管理(03-page-spec 4.5):title/startTime/endTime 必填,endTime ≥ startTime(DATETIME)
interface ActivityForm {
  title: string;
  startTime: string;
  endTime: string;
  locationId: number | undefined;
  signupMethod: string;
  targetAudience: string;
  description: string;
  isEnabled: 0 | 1;
}

const list = ref<ActivityItem[]>([]);
const total = ref(0);
const page = ref(1);
const keyword = ref('');
const loading = ref(false);

const locationOptions = ref<Array<{ id: number; name: string }>>([]);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);
const formRef = ref<FormInstance | null>(null);
const form = reactive<ActivityForm>({
  title: '',
  startTime: '',
  endTime: '',
  locationId: undefined,
  signupMethod: '',
  targetAudience: '',
  description: '',
  isEnabled: 1
});

function validateEnd(_rule: unknown, value: string, callback: (err?: Error) => void): void {
  if (!value) callback(new Error('结束时间不能为空'));
  else if (!isDateTimeString(value)) callback(new Error(INVALID_DATE_MESSAGE));
  else if (form.startTime && value < form.startTime) callback(new Error('结束时间不能早于开始时间'));
  else callback();
}

const rules: Record<string, FormItemRule[]> = {
  title: [
    { required: true, message: '标题不能为空', trigger: 'blur' },
    { max: 100, message: '标题不能超过 100 字', trigger: 'blur' }
  ],
  startTime: [
    { required: true, message: '开始时间不能为空', trigger: 'change' },
    {
      validator: (_rule: unknown, value: string, callback: (err?: Error) => void) => {
        if (!value || isDateTimeString(value)) callback();
        else callback(new Error(INVALID_DATE_MESSAGE));
      },
      trigger: 'change'
    }
  ],
  endTime: [{ required: true, validator: validateEnd, trigger: 'change' }],
  signupMethod: [{ max: 200, message: '报名方式不能超过 200 字', trigger: 'blur' }],
  targetAudience: [{ max: 200, message: '适用对象不能超过 200 字', trigger: 'blur' }]
};

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminActivities({ page: page.value, pageSize: 10, keyword: keyword.value.trim() || undefined });
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

function openCreate(): void {
  editingId.value = null;
  Object.assign(form, {
    title: '',
    startTime: '',
    endTime: '',
    locationId: undefined,
    signupMethod: '',
    targetAudience: '',
    description: '',
    isEnabled: 1 as 0 | 1
  });
  dialogVisible.value = true;
}

async function openEdit(row: ActivityItem): Promise<void> {
  editingId.value = row.id;
  const detail = await getAdminActivityDetail(row.id);
  Object.assign(form, {
    title: detail.title,
    startTime: detail.startTime,
    endTime: detail.endTime,
    locationId: detail.location?.id,
    signupMethod: detail.signupMethod ?? '',
    targetAudience: detail.targetAudience ?? '',
    description: detail.description ?? '',
    isEnabled: detail.isEnabled ?? 1
  });
  dialogVisible.value = true;
}

async function onSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  // 提交前真实日历兜底校验(GUI 验收 D-MED-2):DATETIME 的日期部分须真实存在
  if (!isDateTimeString(form.startTime) || !isDateTimeString(form.endTime)) {
    ElMessage.error(INVALID_DATE_MESSAGE);
    return;
  }
  saving.value = true;
  try {
    const payload = {
      title: form.title,
      startTime: form.startTime,
      endTime: form.endTime,
      locationId: form.locationId,
      signupMethod: form.signupMethod || undefined,
      targetAudience: form.targetAudience || undefined,
      description: form.description || undefined,
      isEnabled: form.isEnabled
    };
    if (editingId.value === null) await createActivity(payload);
    else await updateActivity(editingId.value, payload);
    ElMessage.success('已保存');
    dialogVisible.value = false;
    void fetchList();
  } finally {
    saving.value = false;
  }
}

async function onDelete(row: ActivityItem): Promise<void> {
  await ElMessageBox.confirm(`确认删除活动「${row.title}」？`, '删除确认', { type: 'warning' });
  await deleteActivity(row.id);
  ElMessage.success('已删除');
  void fetchList();
}

onMounted(async () => {
  void fetchList();
  try {
    const data = await getLocations({ page: 1, pageSize: 100 });
    locationOptions.value = data.list.map((l) => ({ id: l.id, name: `${l.campus} · ${l.name}` }));
  } catch {
    locationOptions.value = [];
  }
});
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="page-head">
        <h2>活动管理</h2>
        <p class="page-head__desc">
          维护校园活动的时间、地点、报名方式与适用对象;停用后学生端不可见
        </p>
      </div>
      <div class="toolbar__actions">
        <el-input
          v-model="keyword"
          placeholder="按活动名称搜索"
          clearable
          class="toolbar__keyword"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button
          type="primary"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button
          type="success"
          @click="openCreate"
        >
          新增活动
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
    >
      <el-table-column
        prop="title"
        label="标题"
        min-width="180"
      />
      <el-table-column
        prop="startTime"
        label="开始时间"
        width="170"
      />
      <el-table-column
        prop="endTime"
        label="结束时间"
        width="170"
      />
      <el-table-column
        label="地点"
        min-width="120"
      >
        <template #default="{ row }">
          {{ row.location?.name || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="报名方式"
        min-width="160"
      >
        <template #default="{ row }">
          {{ row.signupMethod || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="140"
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
            link
            type="danger"
            @click="onDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无活动,可调整关键词或新增" />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      layout="total, prev, pager, next"
      class="pager"
      @current-change="fetchList"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="editingId === null ? '新增活动' : '编辑活动'"
      width="620px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="88px"
      >
        <el-form-item
          label="标题"
          prop="title"
        >
          <el-input
            v-model="form.title"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item
          label="开始时间"
          prop="startTime"
        >
          <!-- el-date-picker 根为 tooltip 组件,指令须挂真实 DOM 宿主才能捕获内层 input 事件(D-MED-2) -->
          <div
            v-date-guard
            class="date-guard-host"
          >
            <el-date-picker
              v-model="form.startTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="YYYY-MM-DD HH:mm:ss"
            />
          </div>
        </el-form-item>
        <el-form-item
          label="结束时间"
          prop="endTime"
        >
          <div
            v-date-guard
            class="date-guard-host"
          >
            <el-date-picker
              v-model="form.endTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="不早于开始时间"
            />
          </div>
        </el-form-item>
        <el-form-item label="活动地点">
          <el-select
            v-model="form.locationId"
            placeholder="可选"
            clearable
          >
            <el-option
              v-for="l in locationOptions"
              :key="l.id"
              :label="l.name"
              :value="l.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="报名方式"
          prop="signupMethod"
        >
          <el-input
            v-model="form.signupMethod"
            maxlength="200"
          />
        </el-form-item>
        <el-form-item
          label="适用对象"
          prop="targetAudience"
        >
          <el-input
            v-model="form.targetAudience"
            maxlength="200"
          />
        </el-form-item>
        <el-form-item label="活动介绍">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="2000"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch
            v-model="form.isEnabled"
            :active-value="1"
            :inactive-value="0"
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
          @click="onSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
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
.toolbar__actions {
  display: flex;
  gap: 8px;
}
.toolbar__keyword {
  width: 220px;
}
</style>
