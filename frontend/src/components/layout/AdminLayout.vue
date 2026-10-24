<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

// 管理端布局:侧边菜单 + 顶栏(用户名/退出登录)
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const activeMenu = computed(() => route.path);

async function onLogout(): Promise<void> {
  await ElMessageBox.confirm('确定退出登录吗?', '退出登录', { type: 'warning' });
  auth.logout();
  router.push('/admin/login');
}
</script>

<template>
  <el-container class="admin-layout">
    <el-aside
      width="220px"
      class="admin-layout__aside"
    >
      <div class="admin-layout__brand">
        SSDA 管理后台
      </div>
      <el-menu
        router
        :default-active="activeMenu"
        class="admin-layout__menu"
      >
        <el-menu-item index="/admin/knowledge">
          知识管理
        </el-menu-item>
        <el-menu-item index="/admin/categories">
          分类管理
        </el-menu-item>
        <el-menu-item index="/admin/services">
          办事指南管理
        </el-menu-item>
        <el-menu-item index="/admin/activities">
          活动管理
        </el-menu-item>
        <el-menu-item index="/admin/locations">
          地点管理
        </el-menu-item>
        <el-menu-item index="/admin/courses-teachers">
          课程教师管理
        </el-menu-item>
        <el-menu-item index="/admin/expired">
          过期信息工作台
        </el-menu-item>
        <el-menu-item index="/admin/ai-logs">
          AI 对话记录
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header
        class="admin-layout__header"
        height="56px"
      >
        <span class="admin-layout__title">新生校园知识库与入学事务辅助系统</span>
        <div class="admin-layout__user">
          <span data-testid="admin-username">{{ auth.username || '管理员' }}</span>
          <el-button
            link
            type="danger"
            @click="onLogout"
          >
            退出登录
          </el-button>
        </div>
      </el-header>
      <el-main class="admin-layout__main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
}
.admin-layout__aside {
  border-right: 1px solid #ebeef5;
  background: #fff;
}
.admin-layout__brand {
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #409eff;
}
.admin-layout__menu {
  border-right: none;
}
.admin-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
}
.admin-layout__title {
  font-size: 14px;
  color: #606266;
}
.admin-layout__user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}
</style>
