<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormItemRule } from 'element-plus';
import { createLocation, deleteLocation, getAdminLocations, updateLocation } from '@/api/admin';
import type { LocationItem } from '@/types/location';

// 地点管理(03-page-spec 4.6):name/campus 必填;删除被引用时 409 提示含引用数
interface LocationForm {
  name: string;
  campus: string;
  building: string;
  floor: string;
  room: string;
  description: string;
}

const list = ref<LocationItem[]>([]);
const total = ref(0);
const page = ref(1);
const keyword = ref('');
const loading = ref(false);

const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);
const formRef = ref<FormInstance | null>(null);
const form = reactive<LocationForm>({ name: '', campus: '', building: '', floor: '', room: '', description: '' });

const rules: Record<string, FormItemRule[]> = {
  name: [
    { required: true, message: '地点名称不能为空', trigger: 'blur' },
    { max: 100, message: '地点名称不能超过 100 字', trigger: 'blur' }
  ],
  campus: [
    { required: true, message: '校区不能为空', trigger: 'blur' },
    { max: 50, message: '校区不能超过 50 字', trigger: 'blur' }
  ],
  building: [{ max: 100, message: '建筑不能超过 100 字', trigger: 'blur' }],
  floor: [{ max: 20, message: '楼层不能超过 20 字', trigger: 'blur' }],
  room: [{ max: 50, message: '房间不能超过 50 字', trigger: 'blur' }],
  description: [{ max: 500, message: '说明不能超过 500 字', trigger: 'blur' }]
};

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminLocations({ page: page.value, pageSize: 10, keyword: keyword.value.trim() || undefined });
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
  Object.assign(form, { name: '', campus: '', building: '', floor: '', room: '', description: '' });
  dialogVisible.value = true;
}

function openEdit(row: LocationItem): void {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    campus: row.campus,
    building: row.building ?? '',
    floor: row.floor ?? '',
    room: row.room ?? '',
    description: row.description ?? ''
  });
  dialogVisible.value = true;
}

async function onSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload = {
      name: form.name,
      campus: form.campus,
      building: form.building || undefined,
      floor: form.floor || undefined,
      room: form.room || undefined,
      description: form.description || undefined
    };
    if (editingId.value === null) await createLocation(payload);
    else await updateLocation(editingId.value, payload);
    ElMessage.success('已保存');
    dialogVisible.value = false;
    void fetchList();
  } finally {
    saving.value = false;
  }
}

async function onDelete(row: LocationItem): Promise<void> {
  await ElMessageBox.confirm(`确认删除地点「${row.name}」？`, '删除确认', { type: 'warning' });
  try {
    await deleteLocation(row.id); // 409(被引用)拦截器展示后端 message 含引用数量
    ElMessage.success('已删除');
    void fetchList();
  } catch {
    // 保持列表状态不变
  }
}

onMounted(fetchList);
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="page-head">
        <h2>地点管理</h2>
        <p class="page-head__desc">
          维护校区、建筑、楼层与房间信息;被引用的地点删除会被拒绝
        </p>
      </div>
      <div class="toolbar__actions">
        <el-input
          v-model="keyword"
          placeholder="按名称搜索"
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
          新增地点
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="name"
        label="名称"
        min-width="150"
        show-overflow-tooltip
      />
      <el-table-column
        prop="campus"
        label="校区"
        width="110"
      />
      <el-table-column
        label="建筑"
        min-width="130"
      >
        <template #default="{ row }">
          {{ row.building || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="楼层"
        width="80"
      >
        <template #default="{ row }">
          {{ row.floor || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="房间"
        width="100"
      >
        <template #default="{ row }">
          {{ row.room || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="说明"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.description || '—' }}
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
        <el-empty description="暂无地点,可调整关键词或新增" />
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

    <el-dialog
      v-model="dialogVisible"
      :title="editingId === null ? '新增地点' : '编辑地点'"
      width="520px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="72px"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            maxlength="100"
            placeholder="如:第一教学楼"
          />
        </el-form-item>
        <el-form-item
          label="校区"
          prop="campus"
        >
          <el-input
            v-model="form.campus"
            maxlength="50"
            placeholder="如:犀浦校区"
          />
        </el-form-item>
        <el-form-item
          label="建筑"
          prop="building"
        >
          <el-input
            v-model="form.building"
            maxlength="100"
            placeholder="如:综合楼"
          />
        </el-form-item>
        <el-form-item
          label="楼层"
          prop="floor"
        >
          <el-input
            v-model="form.floor"
            maxlength="20"
            placeholder="如:1"
          />
        </el-form-item>
        <el-form-item
          label="房间"
          prop="room"
        >
          <el-input
            v-model="form.room"
            maxlength="50"
            placeholder="如:X101"
          />
        </el-form-item>
        <el-form-item
          label="说明"
          prop="description"
        >
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            placeholder="选填,如:位于一层大厅东侧,近东门"
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
