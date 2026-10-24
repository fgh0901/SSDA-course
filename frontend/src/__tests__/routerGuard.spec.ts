import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import router from '@/router';
import { useAuthStore } from '@/stores/auth';
import { TOKEN_KEY } from '@/api/http';

// 全局守卫(03-page-spec 1.2):未登录访问 /admin/* → /admin/login?redirect=;已登录访问登录页 → 管理首页
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

describe('管理端路由守卫(TC-07 体验层)', () => {
  it('未登录访问 /admin/knowledge:重定向登录页并携带 redirect 参数', async () => {
    await router.push('/admin/knowledge');
    await router.isReady();
    expect(router.currentRoute.value.path).toBe('/admin/login');
    expect(router.currentRoute.value.query.redirect).toBe('/admin/knowledge');
  });

  it('未登录访问 /admin:重定向登录页', async () => {
    await router.push('/admin');
    expect(router.currentRoute.value.path).toBe('/admin/login');
  });

  it('已登录访问登录页:跳转管理首页', async () => {
    const auth = useAuthStore();
    auth.token = 'some-token';
    localStorage.setItem(TOKEN_KEY, 'some-token');
    await router.push('/admin/login');
    expect(router.currentRoute.value.path).toBe('/admin/knowledge');
  });

  it('已登录访问 /admin/*:正常放行', async () => {
    const auth = useAuthStore();
    auth.token = 'some-token';
    await router.push('/admin/categories');
    expect(router.currentRoute.value.path).toBe('/admin/categories');
  });

  it('学生端路由不受守卫影响', async () => {
    await router.push('/knowledge');
    expect(router.currentRoute.value.path).toBe('/knowledge');
  });
});
