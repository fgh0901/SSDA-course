<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getKnowledgeList } from '@/api/knowledge';
import { useCategoryStore } from '@/stores/category';
import KnowledgeCard from '@/components/KnowledgeCard.vue';
import type { KnowledgeItem } from '@/types/knowledge';

// 知识列表(03-page-spec 3.2):分类筛选 + 关键词 + 分页;categoryId 同步 URL 可分享回跳
const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryStore();

const list = ref<KnowledgeItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const categoryId = ref<number | undefined>(undefined);
const loading = ref(false);
const searchedEmptyKeyword = ref(false);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getKnowledgeList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      categoryId: categoryId.value
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

// 空关键词搜索:toast + 页内提示,并展示默认列表,不发关键词请求(TC-02 / GUI 验收 D-LOW-1)
function onSearch(): void {
  if (!keyword.value.trim()) {
    searchedEmptyKeyword.value = true;
    ElMessage.warning('请输入关键词');
    page.value = 1;
    categoryId.value = undefined;
    void fetchList();
    return;
  }
  searchedEmptyKeyword.value = false;
  page.value = 1;
  void fetchList();
}

function onCategoryChange(val: number | undefined): void {
  // 「全部分类」重置项(占位值 0):清空筛选并刷新(GUI 验收 D-LOW-5)
  categoryId.value = val === 0 ? undefined : val;
  page.value = 1;
  searchedEmptyKeyword.value = false;
  // 分类同步 URL query,可分享回跳
  router.replace({
    query: { ...route.query, categoryId: categoryId.value ? String(categoryId.value) : undefined }
  });
  void fetchList();
}

function onPageChange(): void {
  void fetchList();
}

watch(
  () => route.query.categoryId,
  (v) => {
    const id = v ? Number(v) : undefined;
    if (id !== categoryId.value && (!id || Number.isInteger(id))) {
      categoryId.value = id;
      page.value = 1;
      void fetchList();
    }
  }
);

onMounted(async () => {
  void categoryStore.fetchOnce();
  const qc = route.query.categoryId;
  categoryId.value = qc ? Number(qc) : undefined;
  await fetchList();
});
</script>

<template>
  <div>
    <div class="page-head">
      <h1>知识库</h1>
      <p class="page-head__desc">
        按分类浏览校园知识,或输入关键词检索;条目均标注来源与更新时间
      </p>
    </div>
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="输入关键词,如:校园卡"
        clearable
        class="filter-bar__keyword"
        data-testid="knowledge-keyword"
        @keyup.enter="onSearch"
        @clear="onSearch"
      />
      <el-button
        type="primary"
        data-testid="knowledge-search"
        @click="onSearch"
      >
        搜索
      </el-button>
      <el-select
        v-model="categoryId"
        placeholder="全部分类"
        clearable
        class="filter-bar__category"
        data-testid="knowledge-category"
        @change="onCategoryChange"
      >
        <el-option
          label="全部分类"
          :value="0"
          data-testid="category-all"
        />
        <el-option
          v-for="c in categoryStore.enabledList"
          :key="c.id"
          :label="c.name"
          :value="c.id"
        />
      </el-select>
    </div>

    <el-alert
      v-if="searchedEmptyKeyword"
      type="info"
      :closable="false"
      title="请输入关键词"
      description="未输入关键词,已为你展示默认列表。"
      data-testid="empty-keyword-tip"
      class="filter-bar__tip"
    />

    <div
      v-loading="loading"
      class="knowledge-list"
    >
      <KnowledgeCard
        v-for="item in list"
        :key="item.id"
        :item="item"
      />
      <el-empty
        v-if="!loading && list.length === 0"
        description="未找到相关结果,换个关键词试试"
        data-testid="knowledge-empty"
      />
    </div>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="pager"
      @current-change="onPageChange"
      @size-change="onPageChange"
    />
  </div>
</template>

<style scoped>
.filter-bar__keyword {
  width: 280px;
}
.filter-bar__category {
  width: 160px;
}
.filter-bar__tip {
  margin-bottom: 16px;
}
.knowledge-list {
  display: grid;
  gap: 16px;
  min-height: 120px;
}
</style>
