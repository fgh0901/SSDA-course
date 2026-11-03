<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormItemRule } from 'element-plus';
import { createCategory, deleteCategory, getAdminCategories, updateCategory } from '@/api/admin';
import type { AdminCategory } from '@/types/category';

// 分类管理(03-page-spec 4.4):name 必填 1~50;删除 409(仍有关联知识)原样提示;knowledgeCount 预警
const list = ref<AdminCategory[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);
const formRef = ref<FormInstance | null>(null);
const form = reactive({ name: '', description: '', sortOrder: 0, isEnabled: 1 as 0 | 1 });

const rules: Record<string, FormItemRule[]> = {
  name: [
    { required: true, message: '分类名称不能为空', trigger: 'blur' },
    { max: 50, message: '分类名称不能超过 50 字', trigger: 'blur' }
  ],
  description: [{ max: 200, message: '描述不能超过 200 字', trigger: 'blur' }]
};

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminCategories();
    list.value = data.list;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editingId.value = null;
  Object.assign(form, { name: '', description: '', sortOrder: 0, isEnabled: 1 as 0 | 1 });
  dialogVisible.value = true;
}

function openEdit(row: AdminCategory): void {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, description: row.description ?? '', sortOrder: row.sortOrder, isEnabled: row.isEnabled });
  dialogVisible.value = true;
}

async function onSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload = { name: form.name, description: form.description || undefined, sortOrder: form.sortOrder, isEnabled: form.isEnabled };
    if (editingId.value === null) await createCategory(payload);
    else await updateCategory(editingId.value, payload);
    ElMessage.success('已保存');
    dialogVisible.value = false;
    void fetchList();
  } catch {
    // 400 重名"分类名称已存在"由拦截器展示
  } finally {
    saving.value = false;
  }
}

async function onDelete(row: AdminCategory): Promise<void> {
  const tip =
    row.knowledgeCount > 0
      ? `该分类下仍有 ${row.knowledgeCount} 条知识,删除将被拒绝,请先迁移或删除。`
      : `确认删除分类「${row.name}」？`;
  await ElMessageBox.confirm(tip, '删除确认', { type: 'warning' });
  try {
    await deleteCategory(row.id); // 409:拦截器展示后端 message(含条数)
    ElMessage.success('已删除');
    void fetchList();
  } catch {
    // 保持列表状态不变
  }
}

function countTip(row: AdminCategory): string {
  return row.knowledgeCount > 0 ? `${row.knowledgeCount} 条关联知识` : '无关联知识';
}

onMounted(fetchList);
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="page-head">
        <h2>分类管理</h2>
        <p class="page-head__desc">
          维护知识分类的名称、排序与启用状态;停用后学生端导航不再展示
        </p>
      </div>
      <el-button
        type="primary"
        data-testid="category-create"
        @click="openCreate"
      >
        新增分类
      </el-button>
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
        prop="name"
        label="名称"
        min-width="140"
        show-overflow-tooltip
      />
      <el-table-column
        prop="description"
        label="描述"
        min-width="220"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.description || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="sortOrder"
        label="排序"
        width="80"
      />
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.isEnabled === 1 ? 'success' : 'info'"
            size="small"
          >
            {{ row.isEnabled === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="关联知识"
        width="140"
      >
        <template #default="{ row }">
          <span :class="{ 'count-warn': row.knowledgeCount > 0 }">{{ countTip(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="160"
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
        <el-empty description="暂无分类,点击右上角新增" />
      </template>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId === null ? '新增分类' : '编辑分类'"
      width="480px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="88px"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            maxlength="50"
            data-testid="category-name"
          />
        </el-form-item>
        <el-form-item
          label="描述"
          prop="description"
        >
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            maxlength="200"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
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
.count-warn {
  color: var(--el-color-warning);
}
</style>
