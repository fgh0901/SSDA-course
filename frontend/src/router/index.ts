import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// 路由表:学生端 11 条(03-page-spec 1.1)+ 管理端 9 条(03-page-spec 1.2)
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ---- 学生端(StudentLayout:顶部导航 + AI 悬浮入口 + 页脚) ----
    {
      path: '/',
      component: () => import('@/components/layout/StudentLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/student/HomeView.vue') },
        { path: 'knowledge', name: 'knowledge-list', component: () => import('@/views/student/KnowledgeListView.vue') },
        { path: 'knowledge/:id', name: 'knowledge-detail', component: () => import('@/views/student/KnowledgeDetailView.vue') },
        { path: 'services', name: 'service-list', component: () => import('@/views/student/ServiceListView.vue') },
        { path: 'services/:id', name: 'service-detail', component: () => import('@/views/student/ServiceDetailView.vue') },
        { path: 'activities', name: 'activity-list', component: () => import('@/views/student/ActivityListView.vue') },
        { path: 'activities/:id', name: 'activity-detail', component: () => import('@/views/student/ActivityDetailView.vue') },
        { path: 'locations', name: 'locations', component: () => import('@/views/student/LocationView.vue') },
        { path: 'courses-teachers', name: 'courses-teachers', component: () => import('@/views/student/CourseTeacherView.vue') },
        { path: 'search', name: 'search-result', component: () => import('@/views/student/SearchResultView.vue') },
        { path: 'ai-chat', name: 'ai-chat', component: () => import('@/views/student/AiChatView.vue') }
      ]
    },
    // ---- 管理端(AdminLayout:侧边菜单,统一挂 /admin) ----
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/LoginView.vue')
    },
    {
      path: '/admin',
      component: () => import('@/components/layout/AdminLayout.vue'),
      redirect: '/admin/knowledge',
      children: [
        { path: 'knowledge', name: 'admin-knowledge', component: () => import('@/views/admin/KnowledgeManageView.vue') },
        { path: 'categories', name: 'admin-categories', component: () => import('@/views/admin/CategoryManageView.vue') },
        { path: 'services', name: 'admin-services', component: () => import('@/views/admin/ServiceManageView.vue') },
        { path: 'activities', name: 'admin-activities', component: () => import('@/views/admin/ActivityManageView.vue') },
        { path: 'locations', name: 'admin-locations', component: () => import('@/views/admin/LocationManageView.vue') },
        { path: 'courses-teachers', name: 'admin-courses-teachers', component: () => import('@/views/admin/CourseTeacherManageView.vue') },
        { path: 'expired', name: 'admin-expired', component: () => import('@/views/admin/ExpiredWorkbenchView.vue') },
        { path: 'ai-logs', name: 'admin-ai-logs', component: () => import('@/views/admin/AiLogView.vue') }
      ]
    },
    // ---- 兜底:未匹配地址显示 404,避免空白页 ----
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
});

// 全局前置守卫:未登录访问 /admin/*(除登录页)→ /admin/login?redirect=
// 前端守卫仅为体验优化,权限以服务端 401/403 为准(TC-07)
router.beforeEach((to) => {
  if (!to.path.startsWith('/admin')) return true;
  const auth = useAuthStore();
  if (to.path === '/admin/login') {
    // 已登录访问登录页 → 跳管理首页(03-page-spec 1.2)
    if (auth.token) return { path: '/admin/knowledge' };
    return true;
  }
  if (!auth.token) {
    return { path: '/admin/login', query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
