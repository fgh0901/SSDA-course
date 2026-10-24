<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getKnowledgeList } from '@/api/knowledge';
import { useCategoryStore } from '@/stores/category';
import KnowledgeCard from '@/components/KnowledgeCard.vue';
import SearchBar from '@/components/SearchBar.vue';
import type { KnowledgeItem } from '@/types/knowledge';

// 首页(03-page-spec 3.1):大搜索框 + 分类导航卡 + 最新知识
const router = useRouter();
const categoryStore = useCategoryStore();
const latest = ref<KnowledgeItem[]>([]);
const loading = ref(false);

onMounted(async () => {
  void categoryStore.fetchOnce();
  loading.value = true;
  try {
    const data = await getKnowledgeList({ page: 1, pageSize: 8 });
    latest.value = data.list;
  } finally {
    loading.value = false;
  }
});

function goCategory(categoryId: number): void {
  router.push({ path: '/knowledge', query: { categoryId: String(categoryId) } });
}
</script>

<template>
  <div class="home">
    <section class="home__hero">
      <h1 class="home__title">
        新生校园知识库与入学事务辅助系统
      </h1>
      <p class="home__subtitle">
        校园知识、办事指南、活动与课程教师信息一站查询
      </p>
      <div class="home__search">
        <SearchBar data-testid="home-search" />
      </div>
    </section>

    <section class="home__section">
      <h2 class="home__section-title">
        知识分类
      </h2>
      <el-row
        v-if="categoryStore.enabledList.length > 0"
        :gutter="16"
      >
        <el-col
          v-for="c in categoryStore.enabledList"
          :key="c.id"
          :span="8"
        >
          <el-card
            shadow="hover"
            class="home__category-card"
            data-testid="category-card"
            @click="goCategory(c.id)"
          >
            <div class="home__category-name">
              {{ c.name }}
            </div>
            <div class="home__category-desc">
              {{ c.description || '查看该分类下的知识条目' }}
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty
        v-else
        description="暂无分类"
      />
    </section>

    <section class="home__section">
      <div class="home__section-header">
        <h2 class="home__section-title">
          最新知识
        </h2>
        <router-link to="/knowledge">
          查看全部 →
        </router-link>
      </div>
      <div
        v-loading="loading"
        class="home__latest"
      >
        <KnowledgeCard
          v-for="item in latest"
          :key="item.id"
          :item="item"
        />
        <el-empty
          v-if="!loading && latest.length === 0"
          description="暂无已发布知识"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home__hero {
  text-align: center;
  padding: 40px 0 24px;
}
.home__title {
  font-size: 28px;
  margin: 0 0 8px;
}
.home__subtitle {
  color: #909399;
  margin: 0 0 24px;
}
.home__search {
  max-width: 640px;
  margin: 0 auto;
}
.home__section {
  margin-top: 32px;
}
.home__section-title {
  font-size: 18px;
  margin: 0 0 12px;
}
.home__section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.home__category-card {
  cursor: pointer;
  margin-bottom: 16px;
}
.home__category-name {
  font-size: 16px;
  font-weight: 600;
}
.home__category-desc {
  color: #909399;
  font-size: 13px;
  margin-top: 4px;
}
.home__latest {
  display: grid;
  gap: 12px;
}
</style>
