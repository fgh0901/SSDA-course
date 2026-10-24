<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormItemRule } from 'element-plus';
import {
  createService,
  deleteService,
  getAdminServiceDetail,
  getAdminServices,
  updateService
} from '@/api/admin';
import { getLocations } from '@/api/locations';
import type { ServiceItem } from '@/types/service';

// 办事指南管理(03-page-spec 4.5):title/department 必填(1~100),locationId 可选;isEnabled 开关即上下架
interface ServiceForm {
  title: string;
  department: string;
  locationId: number | undefined;
  serviceTime: string;
  materials: string;
  process: string;
  isEnabled: 0 | 1;
}

const list = ref<ServiceItem[]>([]);
const total = ref(0);
const page = ref(1);
const keyword = ref('');
const loading = ref(false);

const locationOptions = ref<Array<{ id: number; name: string }>>([]);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);
const formRef = ref<FormInstance | null>(null);
const form = reactive<ServiceForm>({
  title: '',
  department: '',
  locationId: undefined,
  serviceTime: '',
  materials: '',
  process: '',
  isEnabled: 1
});

const rules: Record<string, FormItemRule[]> = {
  title: [
    { required: true, message: '标题不能为空', trigger: 'blur' },
    { max: 100, message: '标题不能超过 100 字', trigger: 'blur' }
  ],
  department: [
    { required: true, message: '办理部门不能为空', trigger: 'blur' },
    { max: 100, message: '办理部门不能超过 100 字', trigger: 'blur' }
  ],
  serviceTime: [{ max: 100, message: '办理时间不能超过 100 字', trigger: 'blur' }]
};

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminServices({
      page: page.value,
      pageSize: 10,
      keyword: keyword.value.trim() || undefined
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

function openCreate(): void {
  editingId.value = null;
  Object.assign(form, { title: '', department: '', locationId: undefined, serviceTime: '', materials: '', process: '', isEnabled: 1 as 0 | 1 });
  dialogVisible.value = true;
}

async function openEdit(row: ServiceItem): Promise<void> {
  editingId.value = row.id;
  const detail = await getAdminServiceDetail(row.id);
  Object.assign(form, {
    title: detail.title,
    department: detail.department,
    locationId: detail.location?.id,
    serviceTime: detail.serviceTime ?? '',
    materials: detail.materials ?? '',
    process: detail.process ?? '',
    isEnabled: detail.isEnabled
  });
  dialogVisible.value = true;
}

async function onSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload = {
      title: form.title,
      department: form.department,
      locationId: form.locationId,
      serviceTime: form.serviceTime || undefined,
      materials: form.materials || undefined,
      process: form.process || undefined,
      isEnabled: form.isEnabled
    };
    if (editingId.value === null) await createService(payload);
    else await updateService(editingId.value, payload);
    ElMessage.success('已保存');
    dialogVisible.value = false;
    void fetchList();
  } finally {
    saving.value = false;
  }
}

async function onDelete(row: ServiceItem): Promise<void> {
  await ElMessageBox.confirm(`确认删除「${row.title}」?`, '删除确认', { type: 'warning' });
  await deleteService(row.id);
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
      <h2>办事指南管理</h2>
      <div class="toolbar__actions">
        <el-input
          v-model="keyword"
          placeholder="按标题/部门搜索"
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
          新增指南
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
        prop="department"
        label="办理部门"
        min-width="140"
      />
      <el-table-column
        label="办理地点"
        min-width="160"
      >
        <template #default="{ row }">
          {{ row.location ? `${row.location.building || ''}${row.location.room || ''}(${row.location.name})` : '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="serviceTime"
        label="办理时间"
        min-width="130"
      >
        <template #default="{ row }">
          {{ row.serviceTime || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="updatedAt"
        label="更新时间"
        width="170"
      />
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
        <el-empty description="暂无数据" />
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
      :title="editingId === null ? '新增办事指南' : '编辑办事指南'"
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
          label="办理部门"
          prop="department"
        >
          <el-input
            v-model="form.department"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="办理地点">
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
          label="办理时间"
          prop="serviceTime"
        >
          <el-input
            v-model="form.serviceTime"
            maxlength="100"
            placeholder="如:工作日 8:30-17:00"
          />
        </el-form-item>
        <el-form-item label="所需材料">
          <el-input
            v-model="form.materials"
            type="textarea"
            :rows="3"
            maxlength="2000"
          />
        </el-form-item>
        <el-form-item label="办理流程">
          <el-input
            v-model="form.process"
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
  margin-bottom: 12px;
}
.toolbar h2 {
  margin: 0;
}
.toolbar__actions {
  display: flex;
  gap: 8px;
}
.toolbar__keyword {
  width: 220px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
