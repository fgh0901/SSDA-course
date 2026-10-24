import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';

vi.mock('@/api/knowledge', () => ({ getKnowledgeDetail: vi.fn() }));

import { getKnowledgeDetail } from '@/api/knowledge';
import KnowledgeDetailView from '@/views/student/KnowledgeDetailView.vue';
import type { KnowledgeDetail } from '@/types/knowledge';

const mockedDetail = vi.mocked(getKnowledgeDetail);

const baseDetail: KnowledgeDetail = {
  id: 12,
  title: '校园卡遗失补办流程',
  categoryId: 1,
  categoryName: '入学事务',
  content: '一、挂失;二、补办;三、旧卡余额转入新卡。',
  source: '校信息化办公室官网',
  status: 'published',
  isVerified: 1,
  effectiveFrom: '2026-08-20',
  effectiveUntil: '2026-09-30',
  isExpired: false,
  createdAt: '2026-08-20 09:00:00',
  updatedAt: '2026-09-18 10:23:45'
};

async function mountAt(id: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/knowledge/:id', component: KnowledgeDetailView }]
  });
  await router.push(`/knowledge/${id}`);
  await router.isReady();
  return mount(KnowledgeDetailView, {
    global: {
      plugins: [router, ElementPlus],
      stubs: { RouterLink: { template: '<a><slot /></a>' } }
    }
  });
}

describe('知识详情页(TC-04 / TC-09)', () => {
  it('TC-04 展示正文、来源、更新时间与分类', async () => {
    mockedDetail.mockResolvedValue(baseDetail);
    const wrapper = await mountAt('12');
    await flushPromises();
    expect(wrapper.find('[data-testid="knowledge-content"]').text()).toContain('一、挂失');
    expect(wrapper.text()).toContain('来源:校信息化办公室官网');
    expect(wrapper.text()).toContain('更新时间:2026-09-18 10:23:45');
  });

  it('TC-09 isExpired=true 时渲染过期横幅', async () => {
    mockedDetail.mockResolvedValue({ ...baseDetail, isExpired: true });
    const wrapper = await mountAt('12');
    await flushPromises();
    const banner = wrapper.find('[data-testid="expired-banner"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('该信息已过有效期(2026-09-30)');
    expect(banner.text()).toContain('请以官方通知核实');
  });

  it('未过期(isExpired=false)不渲染过期横幅', async () => {
    mockedDetail.mockResolvedValue(baseDetail);
    const wrapper = await mountAt('12');
    await flushPromises();
    expect(wrapper.find('[data-testid="expired-banner"]').exists()).toBe(false);
  });

  it('isVerified=0 显示"待核实"标签', async () => {
    mockedDetail.mockResolvedValue({ ...baseDetail, isVerified: 0 });
    const wrapper = await mountAt('12');
    await flushPromises();
    expect(wrapper.text()).toContain('待核实');
  });

  it('404(不存在/已下架):渲染友好页并提供返回入口,不异常', async () => {
    mockedDetail.mockRejectedValue({ code: 'NOT_FOUND', message: '知识不存在或未发布' });
    const wrapper = await mountAt('999');
    await flushPromises();
    expect(wrapper.text()).toContain('内容不存在或已下架');
    expect(wrapper.text()).toContain('返回知识列表');
  });
});
