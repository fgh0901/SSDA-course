<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormItemRule } from 'element-plus';
import {
  addCourseTeacher,
  createCourse,
  createTeacher,
  deleteCourse,
  deleteTeacher,
  getAdminCourses,
  getAdminTeachers,
  getCourseTeacherRelations,
  removeCourseTeacher,
  updateCourse,
  updateTeacher
} from '@/api/admin';
import { getLocations } from '@/api/locations';
import type { AdminCourseTeacherRel, CourseItem, TeacherItem } from '@/types/course';

// 课程教师管理(03-page-spec 4.7):课程/教师双 Tab CRUD + 任教关系维护(选课程→教师列表增删,重复关联 409)
const activeTab = ref<'course' | 'teacher'>('course');
const locationOptions = ref<Array<{ id: number; name: string }>>([]);

// ---- 课程 Tab ----
const courseList = ref<CourseItem[]>([]);
const courseTotal = ref(0);
const coursePage = ref(1);
const courseKeyword = ref('');
const loading = ref(false);

const courseDialogVisible = ref(false);
const editingCourseId = ref<number | null>(null);
const courseSaving = ref(false);
const courseFormRef = ref<FormInstance | null>(null);
const courseForm = reactive({ name: '', code: '', semester: '', description: '' });

const courseRules: Record<string, FormItemRule[]> = {
  name: [
    { required: true, message: '课程名称不能为空', trigger: 'blur' },
    { max: 100, message: '课程名称不能超过 100 字', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '课程代码不能为空', trigger: 'blur' },
    { max: 20, message: '课程代码不能超过 20 字', trigger: 'blur' }
  ],
  semester: [{ max: 20, message: '学期不能超过 20 字', trigger: 'blur' }],
  description: [{ max: 500, message: '描述不能超过 500 字', trigger: 'blur' }]
};

async function fetchCourses(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminCourses({ page: coursePage.value, pageSize: 10, keyword: courseKeyword.value.trim() || undefined });
    courseList.value = data.list;
    courseTotal.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onCourseSearch(): void {
  coursePage.value = 1;
  void fetchCourses();
}

// ---- 教师 Tab ----
const teacherList = ref<TeacherItem[]>([]);
const teacherTotal = ref(0);
const teacherPage = ref(1);
const teacherKeyword = ref('');

const teacherDialogVisible = ref(false);
const editingTeacherId = ref<number | null>(null);
const teacherSaving = ref(false);
const teacherFormRef = ref<FormInstance | null>(null);
// 教师表单仅含公开字段(契约 3.17 strict,多余字段 400)
const teacherForm = reactive<{ name: string; title: string; officeLocationId: number | undefined; officeHours: string }>({
  name: '',
  title: '',
  officeLocationId: undefined,
  officeHours: ''
});

const teacherRules: Record<string, FormItemRule[]> = {
  name: [
    { required: true, message: '教师姓名不能为空', trigger: 'blur' },
    { max: 50, message: '教师姓名不能超过 50 字', trigger: 'blur' }
  ],
  title: [{ max: 50, message: '职称不能超过 50 字', trigger: 'blur' }],
  officeHours: [{ max: 100, message: '答疑时间不能超过 100 字', trigger: 'blur' }]
};

async function fetchTeachers(): Promise<void> {
  loading.value = true;
  try {
    const data = await getAdminTeachers({ page: teacherPage.value, pageSize: 10, keyword: teacherKeyword.value.trim() || undefined });
    teacherList.value = data.list;
    teacherTotal.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onTeacherSearch(): void {
  teacherPage.value = 1;
  void fetchTeachers();
}

function onTabChange(): void {
  if (activeTab.value === 'course' && courseList.value.length === 0) void fetchCourses();
  if (activeTab.value === 'teacher' && teacherList.value.length === 0) void fetchTeachers();
}

// ---- 课程表单 ----
function openCourseCreate(): void {
  editingCourseId.value = null;
  Object.assign(courseForm, { name: '', code: '', semester: '', description: '' });
  courseDialogVisible.value = true;
}

function openCourseEdit(row: CourseItem): void {
  editingCourseId.value = row.id;
  Object.assign(courseForm, { name: row.name, code: row.code, semester: row.semester ?? '', description: '' });
  courseDialogVisible.value = true;
}

async function onCourseSave(): Promise<void> {
  const valid = await courseFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  courseSaving.value = true;
  try {
    const payload = {
      name: courseForm.name,
      code: courseForm.code,
      semester: courseForm.semester || undefined,
      description: courseForm.description || undefined
    };
    if (editingCourseId.value === null) await createCourse(payload);
    else await updateCourse(editingCourseId.value, payload);
    ElMessage.success('已保存');
    courseDialogVisible.value = false;
    void fetchCourses();
  } finally {
    courseSaving.value = false;
  }
}

async function onCourseDelete(row: CourseItem): Promise<void> {
  await ElMessageBox.confirm(`确认删除课程「${row.name}」？存在任教关系时将被拒绝。`, '删除确认', { type: 'warning' });
  try {
    await deleteCourse(row.id);
    ElMessage.success('已删除');
    void fetchCourses();
  } catch {
    // 409 由拦截器展示
  }
}

// ---- 教师表单 ----
function openTeacherCreate(): void {
  editingTeacherId.value = null;
  Object.assign(teacherForm, { name: '', title: '', officeLocationId: undefined, officeHours: '' });
  teacherDialogVisible.value = true;
}

function openTeacherEdit(row: TeacherItem): void {
  editingTeacherId.value = row.id;
  Object.assign(teacherForm, {
    name: row.name,
    title: row.title ?? '',
    officeLocationId: row.office?.id,
    officeHours: row.officeHours ?? ''
  });
  teacherDialogVisible.value = true;
}

async function onTeacherSave(): Promise<void> {
  const valid = await teacherFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  teacherSaving.value = true;
  try {
    const payload = {
      name: teacherForm.name,
      title: teacherForm.title || undefined,
      officeLocationId: teacherForm.officeLocationId,
      officeHours: teacherForm.officeHours || undefined
    };
    if (editingTeacherId.value === null) await createTeacher(payload);
    else await updateTeacher(editingTeacherId.value, payload);
    ElMessage.success('已保存');
    teacherDialogVisible.value = false;
    void fetchTeachers();
  } finally {
    teacherSaving.value = false;
  }
}

async function onTeacherDelete(row: TeacherItem): Promise<void> {
  await ElMessageBox.confirm(`确认删除教师「${row.name}」？存在任教关系时将被拒绝。`, '删除确认', { type: 'warning' });
  try {
    await deleteTeacher(row.id);
    ElMessage.success('已删除');
    void fetchTeachers();
  } catch {
    // 409 由拦截器展示
  }
}

// ---- 任教关系维护 ----
const relationVisible = ref(false);
const relationCourse = ref<CourseItem | null>(null);
const relations = ref<AdminCourseTeacherRel[]>([]);
const relationLoading = ref(false);
const relationSaving = ref(false);
const relationFormRef = ref<FormInstance | null>(null);
const relationForm = reactive<{ teacherId: number | undefined; locationId: number | undefined; schedule: string }>({
  teacherId: undefined,
  locationId: undefined,
  schedule: ''
});

const teacherOptions = ref<Array<{ id: number; name: string }>>([]);
const relationRules: Record<string, FormItemRule[]> = {
  teacherId: [{ required: true, message: '请选择教师', trigger: 'change' }]
};

async function openRelations(row: CourseItem): Promise<void> {
  relationCourse.value = row;
  relationVisible.value = true;
  await reloadRelations();
  try {
    const data = await getAdminTeachers({ page: 1, pageSize: 100 });
    teacherOptions.value = data.list.map((t) => ({ id: t.id, name: `${t.name}${t.title ? `(${t.title})` : ''}` }));
  } catch {
    teacherOptions.value = [];
  }
}

async function reloadRelations(): Promise<void> {
  if (!relationCourse.value) return;
  relationLoading.value = true;
  try {
    const data = await getCourseTeacherRelations(relationCourse.value.id);
    relations.value = data.list;
  } finally {
    relationLoading.value = false;
  }
}

async function onAddRelation(): Promise<void> {
  const valid = await relationFormRef.value?.validate().catch(() => false);
  if (!valid || !relationCourse.value) return;
  relationSaving.value = true;
  try {
    await addCourseTeacher(relationCourse.value.id, {
      teacherId: relationForm.teacherId as number,
      locationId: relationForm.locationId,
      schedule: relationForm.schedule || undefined
    });
    ElMessage.success('已添加任教关系');
    Object.assign(relationForm, { teacherId: undefined, locationId: undefined, schedule: '' });
    await reloadRelations();
  } catch {
    // 409"该教师已关联此课程"由拦截器展示
  } finally {
    relationSaving.value = false;
  }
}

async function onRemoveRelation(rel: AdminCourseTeacherRel): Promise<void> {
  if (!relationCourse.value) return;
  await ElMessageBox.confirm(`确认移除教师「${rel.teacherName}」的任教关系？`, '移除确认', { type: 'warning' });
  await removeCourseTeacher(relationCourse.value.id, rel.relationId);
  ElMessage.success('已移除');
  await reloadRelations();
}

onMounted(async () => {
  void fetchCourses();
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
    <div class="page-head">
      <h2>课程教师管理</h2>
      <p class="page-head__desc">
        维护课程、教师基础信息与任教关系;未录入的关系不做推断,以教务系统课表为准
      </p>
    </div>
    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="课程"
        name="course"
      >
        <div class="toolbar">
          <div class="toolbar__actions">
            <el-input
              v-model="courseKeyword"
              placeholder="按课程名称/代码搜索"
              clearable
              class="toolbar__keyword"
              @keyup.enter="onCourseSearch"
              @clear="onCourseSearch"
            />
            <el-button
              @click="onCourseSearch"
            >
              搜索
            </el-button>
            <el-button
              type="primary"
              @click="openCourseCreate"
            >
              新增课程
            </el-button>
          </div>
        </div>
        <el-table
          v-loading="loading"
          :data="courseList"
          stripe
        >
          <el-table-column
            prop="name"
            label="课程名称"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="code"
            label="课程代码"
            width="140"
          />
          <el-table-column
            prop="semester"
            label="学期"
            width="140"
          >
            <template #default="{ row }">
              {{ row.semester || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="任课教师"
            min-width="150"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span v-if="row.teachers.length > 0">{{ row.teachers.map((t: { name: string }) => t.name).join('、') }}</span>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="220"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                @click="openRelations(row)"
              >
                任教关系
              </el-button>
              <el-button
                link
                type="primary"
                @click="openCourseEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                @click="onCourseDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无课程,可调整关键词或新增" />
          </template>
        </el-table>
        <el-pagination
          v-model:current-page="coursePage"
          :total="courseTotal"
          layout="total, prev, pager, next"
          background
          class="pager"
          @current-change="fetchCourses"
        />
      </el-tab-pane>

      <el-tab-pane
        label="教师"
        name="teacher"
      >
        <div class="toolbar">
          <div class="toolbar__actions">
            <el-input
              v-model="teacherKeyword"
              placeholder="按教师姓名搜索"
              clearable
              class="toolbar__keyword"
              @keyup.enter="onTeacherSearch"
              @clear="onTeacherSearch"
            />
            <el-button
              @click="onTeacherSearch"
            >
              搜索
            </el-button>
            <el-button
              type="primary"
              @click="openTeacherCreate"
            >
              新增教师
            </el-button>
          </div>
        </div>
        <el-table
          v-loading="loading"
          :data="teacherList"
          stripe
        >
          <el-table-column
            prop="name"
            label="姓名"
            width="120"
          />
          <el-table-column
            prop="title"
            label="职称"
            width="120"
          >
            <template #default="{ row }">
              {{ row.title || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="办公室"
            min-width="140"
          >
            <template #default="{ row }">
              {{ row.office?.name || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            prop="officeHours"
            label="答疑时间"
            min-width="140"
          >
            <template #default="{ row }">
              {{ row.officeHours || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="任教课程"
            min-width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span v-if="row.courses.length > 0">{{ row.courses.map((c: { name: string }) => c.name).join('、') }}</span>
              <span v-else>—</span>
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
                @click="openTeacherEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                @click="onTeacherDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无教师,可调整关键词或新增" />
          </template>
        </el-table>
        <el-pagination
          v-model:current-page="teacherPage"
          :total="teacherTotal"
          layout="total, prev, pager, next"
          background
          class="pager"
          @current-change="fetchTeachers"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 课程表单 -->
    <el-dialog
      v-model="courseDialogVisible"
      :title="editingCourseId === null ? '新增课程' : '编辑课程'"
      width="520px"
    >
      <el-form
        ref="courseFormRef"
        :model="courseForm"
        :rules="courseRules"
        label-width="88px"
      >
        <el-form-item
          label="课程名称"
          prop="name"
        >
          <el-input
            v-model="courseForm.name"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item
          label="课程代码"
          prop="code"
        >
          <el-input
            v-model="courseForm.code"
            maxlength="20"
            placeholder="唯一,如 MATH101"
          />
        </el-form-item>
        <el-form-item
          label="学期"
          prop="semester"
        >
          <el-input
            v-model="courseForm.semester"
            maxlength="20"
            placeholder="如 2026-2027-1"
          />
        </el-form-item>
        <el-form-item
          label="描述"
          prop="description"
        >
          <el-input
            v-model="courseForm.description"
            type="textarea"
            :rows="2"
            maxlength="500"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="courseDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="courseSaving"
          @click="onCourseSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 教师表单(仅公开字段) -->
    <el-dialog
      v-model="teacherDialogVisible"
      :title="editingTeacherId === null ? '新增教师' : '编辑教师'"
      width="520px"
    >
      <el-form
        ref="teacherFormRef"
        :model="teacherForm"
        :rules="teacherRules"
        label-width="88px"
      >
        <el-form-item
          label="姓名"
          prop="name"
        >
          <el-input
            v-model="teacherForm.name"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item
          label="职称"
          prop="title"
        >
          <el-input
            v-model="teacherForm.title"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="办公室">
          <el-select
            v-model="teacherForm.officeLocationId"
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
          label="答疑时间"
          prop="officeHours"
        >
          <el-input
            v-model="teacherForm.officeHours"
            maxlength="100"
            placeholder="如 周三 14:00-16:00"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="teacherDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="teacherSaving"
          @click="onTeacherSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 任教关系维护(选课程 → 教师列表增删) -->
    <el-drawer
      v-model="relationVisible"
      :title="`任教关系:${relationCourse?.name ?? ''}`"
      size="42%"
    >
      <div v-loading="relationLoading">
        <el-form
          ref="relationFormRef"
          :model="relationForm"
          :rules="relationRules"
          inline
          label-width="72px"
        >
          <el-form-item
            label="教师"
            prop="teacherId"
          >
            <el-select
              v-model="relationForm.teacherId"
              placeholder="请选择教师"
              filterable
            >
              <el-option
                v-for="t in teacherOptions"
                :key="t.id"
                :label="t.name"
                :value="t.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="上课地点">
            <el-select
              v-model="relationForm.locationId"
              placeholder="可选"
              clearable
              filterable
            >
              <el-option
                v-for="l in locationOptions"
                :key="l.id"
                :label="l.name"
                :value="l.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="上课时间">
            <el-input
              v-model="relationForm.schedule"
              maxlength="100"
              placeholder="如 周一 3-4 节"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="relationSaving"
              @click="onAddRelation"
            >
              添加
            </el-button>
          </el-form-item>
        </el-form>

        <el-table :data="relations">
          <el-table-column
            prop="teacherName"
            label="教师"
            min-width="110"
          />
          <el-table-column
            label="上课时间"
            min-width="130"
          >
            <template #default="{ row }">
              {{ row.schedule || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="上课地点"
            min-width="130"
          >
            <template #default="{ row }">
              {{ row.location?.name || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="90"
          >
            <template #default="{ row }">
              <el-button
                link
                type="danger"
                @click="onRemoveRelation(row)"
              >
                移除
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无任教关系" />
          </template>
        </el-table>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
.toolbar__actions {
  display: flex;
  gap: 8px;
}
.toolbar__keyword {
  width: 220px;
}
</style>
