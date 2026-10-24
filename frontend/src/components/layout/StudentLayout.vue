<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCategoryStore } from '@/stores/category';
import AiFloatEntry from '@/components/AiFloatEntry.vue';
import PageFooter from '@/components/PageFooter.vue';
import SearchBar from '@/components/SearchBar.vue';

// 学生端布局:顶部导航(分类下拉 + 搜索 + AI 入口)+ AI 悬浮按钮 + 页脚数据来源声明
const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryStore();

onMounted(() => {
  void categoryStore.fetchOnce();
});

function goCategory(categoryId: number): void {
  router.push({ path: '/knowledge', query: { categoryId: String(categoryId) } });
}
</script>

<template>
  <el-container class="student-layout">
    <el-header
      class="student-layout__header"
      height="60px"
    >
      <div class="student-layout__brand">
        <router-link
          to="/"
          class="student-layout__logo"
        >
          <span
            class="student-layout__logo-dot"
            aria-hidden="true"
          />
          新生校园知识库
        </router-link>
        <el-dropdown data-testid="category-nav">
          <span class="student-layout__nav-item">知识分类 ▾</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="c in categoryStore.enabledList"
                :key="c.id"
                @click="goCategory(c.id)"
              >
                {{ c.name }}
              </el-dropdown-item>
              <el-dropdown-item
                v-if="categoryStore.enabledList.length === 0"
                disabled
              >
                暂无分类
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-menu
        mode="horizontal"
        router
        :default-active="route.path"
        :ellipsis="false"
        class="student-layout__menu"
      >
        <el-menu-item index="/">
          首页
        </el-menu-item>
        <el-menu-item index="/knowledge">
          知识库
        </el-menu-item>
        <el-menu-item index="/services">
          办事指南
        </el-menu-item>
        <el-menu-item index="/activities">
          校园活动
        </el-menu-item>
        <el-menu-item index="/locations">
          地点查询
        </el-menu-item>
        <el-menu-item index="/courses-teachers">
          课程教师
        </el-menu-item>
        <el-menu-item index="/ai-chat">
          AI 助手
        </el-menu-item>
      </el-menu>
      <div class="student-layout__search">
        <SearchBar
          size="default"
          placeholder="搜索校园信息"
        />
      </div>
    </el-header>
    <el-main class="student-layout__main">
      <router-view />
    </el-main>
    <PageFooter />
    <AiFloatEntry />
  </el-container>
</template>

<style scoped>
.student-layout__header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid #eef1f6;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.student-layout__brand {
  display: flex;
  align-items: center;
  gap: 16px;
  white-space: nowrap;
}
.student-layout__logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--el-color-primary);
  text-decoration: none;
}
.student-layout__logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(135deg, var(--el-color-primary), #22c1dc);
}
.student-layout__nav-item {
  cursor: pointer;
  color: #606266;
  font-size: 14px;
  outline: none;
}
.student-layout__nav-item:hover {
  color: var(--el-color-primary);
}
.student-layout__menu {
  flex: 1;
  border-bottom: none;
}
.student-layout__menu :deep(.el-menu-item) {
  font-size: 14px;
}
.student-layout__search {
  width: 280px;
}
/* 窄屏顶栏自适应(GUI 验收 D-LOW-3):≈1024px 下压缩间距与搜索宽度,
   搜索框保持固定可用宽度不塌缩,搜索按钮不溢出视口 */
.student-layout__search :deep(.el-input) {
  flex: 1 1 auto;
  min-width: 0;
}
.student-layout__search :deep(.el-button) {
  flex-shrink: 0;
}
@media (max-width: 1280px) {
  .student-layout__header {
    gap: 12px;
  }
  .student-layout__brand {
    gap: 10px;
  }
  .student-layout__menu :deep(.el-menu-item) {
    padding: 0 12px;
  }
  .student-layout__search {
    width: 200px;
  }
}
@media (max-width: 1100px) {
  .student-layout__search {
    width: 170px;
  }
  .student-layout__logo {
    font-size: 16px;
  }
}
.student-layout__main {
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 16px 32px;
  min-height: calc(100vh - 140px);
}
</style>
