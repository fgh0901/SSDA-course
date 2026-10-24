<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getCourseDetail, getCourses, getTeacherDetail, getTeachers } from '@/api/courses';
import type { CourseDetail, CourseItem, TeacherDetail, TeacherItem } from '@/types/course';

// 课程教师查询(03-page-spec 3.7):双 Tab + 详情抽屉;任课关系未录入不做推断(P03)
const activeTab = ref<'course' | 'teacher'>('course');

// 课程 Tab
const courseList = ref<CourseItem[]>([]);
const courseTotal = ref(0);
const coursePage = ref(1);
const courseKeyword = ref('');

// 教师 Tab
const teacherList = ref<TeacherItem[]>([]);
const teacherTotal = ref(0);
const teacherPage = ref(1);
const teacherKeyword = ref('');

const loading = ref(false);
const drawerVisible = ref(false);
const courseDetail = ref<CourseDetail | null>(null);
const teacherDetail = ref<TeacherDetail | null>(null);
const detailLoading = ref(false);

async function fetchCourses(): Promise<void> {
  loading.value = true;
  try {
    const data = await getCourses({
      page: coursePage.value,
      pageSize: 10,
      keyword: courseKeyword.value.trim() || undefined
    });
    courseList.value = data.list;
    courseTotal.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function fetchTeachers(): Promise<void> {
  loading.value = true;
  try {
    const data = await getTeachers({
      page: teacherPage.value,
      pageSize: 10,
      keyword: teacherKeyword.value.trim() || undefined
    });
    teacherList.value = data.list;
    teacherTotal.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onCourseSearch(): void {
  coursePage.value = 1;
  void fetchCourses();
}

function onTeacherSearch(): void {
  teacherPage.value = 1;
  void fetchTeachers();
}

function onTabChange(): void {
  if (activeTab.value === 'course' && courseList.value.length === 0) void fetchCourses();
  if (activeTab.value === 'teacher' && teacherList.value.length === 0) void fetchTeachers();
}

async function openCourse(row: CourseItem): Promise<void> {
  drawerVisible.value = true;
  detailLoading.value = true;
  courseDetail.value = null;
  teacherDetail.value = null;
  try {
    courseDetail.value = await getCourseDetail(row.id);
  } finally {
    detailLoading.value = false;
  }
}

async function openTeacher(row: TeacherItem): Promise<void> {
  drawerVisible.value = true;
  detailLoading.value = true;
  courseDetail.value = null;
  teacherDetail.value = null;
  try {
    teacherDetail.value = await getTeacherDetail(row.id);
  } finally {
    detailLoading.value = false;
  }
}

onMounted(fetchCourses);
</script>

<template>
  <div>
    <h1>课程与教师查询</h1>
    <el-tabs
      v-model="activeTab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="课程"
        name="course"
      >
        <div class="filter-bar">
          <el-input
            v-model="courseKeyword"
            placeholder="输入课程名称/代码"
            clearable
            class="filter-bar__keyword"
            @keyup.enter="onCourseSearch"
            @clear="onCourseSearch"
          />
          <el-button
            type="primary"
            @click="onCourseSearch"
          >
            查询
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="courseList"
          highlight-current-row
          @row-click="openCourse"
        >
          <el-table-column
            prop="name"
            label="课程名称"
            min-width="180"
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
            min-width="160"
          >
            <template #default="{ row }">
              <span v-if="row.teachers.length > 0">{{ row.teachers.map((t: { name: string }) => t.name).join('、') }}</span>
              <span
                v-else
                class="muted"
              >暂无任课信息</span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="未找到相关课程" />
          </template>
        </el-table>
        <el-pagination
          v-model:current-page="coursePage"
          :total="courseTotal"
          layout="total, prev, pager, next"
          class="pager"
          @current-change="fetchCourses"
        />
      </el-tab-pane>

      <el-tab-pane
        label="教师"
        name="teacher"
      >
        <div class="filter-bar">
          <el-input
            v-model="teacherKeyword"
            placeholder="输入教师姓名"
            clearable
            class="filter-bar__keyword"
            @keyup.enter="onTeacherSearch"
            @clear="onTeacherSearch"
          />
          <el-button
            type="primary"
            @click="onTeacherSearch"
          >
            查询
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="teacherList"
          highlight-current-row
          @row-click="openTeacher"
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
            min-width="150"
          >
            <template #default="{ row }">
              {{ row.office?.name || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            prop="officeHours"
            label="答疑时间"
            min-width="150"
          >
            <template #default="{ row }">
              {{ row.officeHours || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="任教课程"
            min-width="200"
          >
            <template #default="{ row }">
              <span v-if="row.courses.length > 0">{{ row.courses.map((c: { name: string }) => c.name).join('、') }}</span>
              <span
                v-else
                class="muted"
              >暂无任课信息</span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="未找到相关教师" />
          </template>
        </el-table>
        <el-pagination
          v-model:current-page="teacherPage"
          :total="teacherTotal"
          layout="total, prev, pager, next"
          class="pager"
          @current-change="fetchTeachers"
        />
      </el-tab-pane>
    </el-tabs>

    <el-drawer
      v-model="drawerVisible"
      size="40%"
    >
      <div v-loading="detailLoading">
        <template v-if="courseDetail">
          <h2>{{ courseDetail.name }}({{ courseDetail.code }})</h2>
          <p class="muted">
            {{ courseDetail.description || '暂无课程简介' }}
          </p>
          <h3>任教教师</h3>
          <template v-if="courseDetail.teachers.length > 0">
            <el-descriptions
              v-for="rel in courseDetail.teachers"
              :key="rel.relationId"
              :column="1"
              border
              class="rel-desc"
            >
              <el-descriptions-item label="教师">
                {{ rel.name }}{{ rel.title ? `(${rel.title})` : '' }}
              </el-descriptions-item>
              <el-descriptions-item label="上课时间">
                {{ rel.schedule || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="上课地点">
                <router-link
                  v-if="rel.location"
                  to="/locations"
                >
                  {{ rel.location.name }}
                </router-link>
                <span v-else>—</span>
              </el-descriptions-item>
              <el-descriptions-item label="办公室">
                {{ rel.office?.name || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="答疑时间">
                {{ rel.officeHours || '—' }}
              </el-descriptions-item>
            </el-descriptions>
          </template>
          <el-empty
            v-else
            description="暂无任课信息,以教务系统课表为准"
          />
        </template>

        <template v-if="teacherDetail">
          <h2>{{ teacherDetail.name }}{{ teacherDetail.title ? `(${teacherDetail.title})` : '' }}</h2>
          <el-descriptions
            :column="1"
            border
            class="rel-desc"
          >
            <el-descriptions-item label="办公室">
              {{ teacherDetail.office?.name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="答疑时间">
              {{ teacherDetail.officeHours || '—' }}
            </el-descriptions-item>
          </el-descriptions>
          <h3>任教课程</h3>
          <template v-if="teacherDetail.courses.length > 0">
            <el-descriptions
              v-for="c in teacherDetail.courses"
              :key="c.id"
              :column="1"
              border
              class="rel-desc"
            >
              <el-descriptions-item label="课程">
                {{ c.name }}
              </el-descriptions-item>
              <el-descriptions-item label="上课时间">
                {{ c.schedule || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="上课地点">
                <router-link
                  v-if="c.location"
                  to="/locations"
                >
                  {{ c.location.name }}
                </router-link>
                <span v-else>—</span>
              </el-descriptions-item>
            </el-descriptions>
          </template>
          <el-empty
            v-else
            description="暂无任课信息,以教务系统课表为准"
          />
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.filter-bar__keyword {
  width: 260px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.rel-desc {
  margin-bottom: 12px;
}
.muted {
  color: #909399;
}
</style>
