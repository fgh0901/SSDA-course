<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { searchAll } from '@/api/search';
import type { SearchGroup, SearchResult } from '@/types/search';
import type { SourceType } from '@/types/api';

// 聚合搜索结果页(03-page-spec 3.8):类型 Tab 筛选 + 每组"共 N 条/查看更多" + 空结果提示(TC-01/02/03)
const TYPE_OPTIONS: Array<{ value: SourceType | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'knowledge', label: '知识' },
  { value: 'service', label: '办事指南' },
  { value: 'activity', label: '活动' },
  { value: 'course', label: '课程' },
  { value: 'teacher', label: '教师' },
  { value: 'location', label: '地点' }
];

const route = useRoute();
const router = useRouter();
const keyword = ref('');
const activeType = ref<SourceType | ''>('');
const result = ref<SearchResult | null>(null);
const loading = ref(false);

const groups = computed<SearchGroup[]>(() => result.value?.groups ?? []);
const hasAnyResult = computed(() => groups.value.some((g) => g.items.length > 0));

const TYPE_PATH: Record<SourceType, string> = {
  knowledge: '/knowledge',
  service: '/services',
  activity: '/activities',
  course: '/courses-teachers',
  teacher: '/courses-teachers',
  location: '/locations'
};

function detailPath(type: SourceType, id: number): string {
  if (type === 'knowledge') return `/knowledge/${id}`;
  if (type === 'service') return `/services/${id}`;
  if (type === 'activity') return `/activities/${id}`;
  return TYPE_PATH[type];
}

function goMore(type: SourceType): void {
  router.push({ path: TYPE_PATH[type], query: { keyword: keyword.value } });
}

async function fetchResult(): Promise<void> {
  loading.value = true;
  try {
    result.value = await searchAll({
      keyword: keyword.value,
      type: activeType.value || undefined,
      page: 1,
      pageSize: 10
    });
  } finally {
    loading.value = false;
  }
}

function onTypeChange(): void {
  if (!keyword.value.trim()) return; // 无关键词不检索(引导输入)
  void fetchResult();
}

function onSearch(): void {
  const kw = keyword.value.trim();
  if (!kw) {
    ElMessage.warning('请输入关键词'); // 与 SearchBar/知识列表一致,不再静默忽略(D-LOW-1)
    return;
  }
  router.replace({ query: { keyword: kw } });
  void fetchResult();
}

onMounted(() => {
  const qk = route.query.keyword;
  if (typeof qk === 'string' && qk.trim()) {
    keyword.value = qk;
    void fetchResult();
  }
});
</script>

<template>
  <div>
    <div class="page-head">
      <h1>搜索结果</h1>
      <p class="page-head__desc">
        汇聚知识、办事指南、活动、课程、教师与地点的聚合检索结果
      </p>
    </div>
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="输入关键词重新搜索"
        clearable
        class="filter-bar__keyword"
        data-testid="search-page-input"
        @keyup.enter="onSearch"
      />
      <el-button
        type="primary"
        @click="onSearch"
      >
        搜索
      </el-button>
    </div>

    <el-empty
      v-if="!keyword.trim()"
      description="请输入关键词开始搜索"
      data-testid="search-no-keyword"
    />

    <template v-else>
      <el-tabs
        v-model="activeType"
        @tab-change="onTypeChange"
      >
        <el-tab-pane
          v-for="opt in TYPE_OPTIONS"
          :key="opt.value || 'all'"
          :label="opt.label"
          :name="opt.value"
        />
      </el-tabs>

      <div v-loading="loading">
        <el-empty
          v-if="!loading && !hasAnyResult"
          description="未找到相关结果,换个关键词试试"
          data-testid="search-empty"
        />

        <section
          v-for="g in groups"
          :key="g.type"
          class="group"
        >
          <div class="group__header">
            <h3 class="group__title">
              {{ TYPE_OPTIONS.find((o) => o.value === g.type)?.label }} · 共 {{ g.total }} 条
            </h3>
            <el-button
              v-if="g.total > g.items.length"
              link
              type="primary"
              @click="goMore(g.type)"
            >
              查看更多 →
            </el-button>
          </div>
          <el-card
            v-for="item in g.items"
            :key="item.id"
            shadow="hover"
            class="group__item"
          >
            <router-link
              :to="detailPath(g.type, item.id)"
              class="group__item-title"
            >
              {{ item.title }}
            </router-link>
            <p class="group__item-summary">
              {{ item.summary }}
            </p>
            <span class="group__item-time">更新于 {{ item.updatedAt }}</span>
          </el-card>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filter-bar__keyword {
  width: 320px;
}
.group {
  margin-bottom: 24px;
}
.group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.group__title {
  margin: 8px 0 12px;
  font-size: 15px;
}
.group__item {
  margin-bottom: 12px;
}
.group__item :deep(.el-card__body) {
  padding: 16px 20px;
}
.group__item-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-decoration: none;
}
.group__item-title:hover {
  color: var(--el-color-primary);
}
.group__item-summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 6px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}
.group__item-time {
  color: #909399;
  font-size: 12px;
}
</style>
