import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';

vi.mock('@/api/knowledge', () => ({ getKnowledgeList: vi.fn() }));
vi.mock('@/api/categories', () => ({ getCategories: vi.fn().mockResolvedValue({ list: [] }) }));

import { getKnowledgeList } from '@/api/knowledge';
import KnowledgeListView from '@/views/student/KnowledgeListView.vue';
import type { KnowledgeItem } from '@/types/knowledge';

const mockedList = vi.mocked(getKnowledgeList);

const item: KnowledgeItem = {
  id: 12,
  title: '校园卡遗失补办流程',
  categoryId: 1,
  categoryName: '入学事务',
  summary: '携带本人身份证到一卡通服务中心办理补办…',
  source: '校信息化办公室官网',
  isVerified: 0,
  effectiveFrom: '2026-08-20',
  effectiveUntil: '2027-08-31',
  updatedAt: '2026-09-18 10:23:45'
};

async function mountView(path = '/knowledge') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/knowledge', component: KnowledgeListView },
      { path: '/search', component: { template: '<div />' } }
    ]
  });
  await router.push(path);
  await router.isReady();
  return mount(KnowledgeListView, {
    global: {
      plugins: [createPinia(), router, ElementPlus],
      stubs: { RouterLink: { template: '<a><slot /></a>' } }
    }
  });
}

beforeEach(() => {
  mockedList.mockReset();
  localStorage.clear();
});

describe('知识列表页(TC-02 空关键词 / TC-03 无结果)', () => {
  it('TC-02 空关键词搜索:展示"请输入关键词"提示与默认列表,页面不异常', async () => {
    mockedList.mockResolvedValue({ list: [item], total: 1, page: 1, pageSize: 10 });
    const wrapper = await mountView();
    await flushPromises();
    expect(wrapper.text()).not.toContain('undefined');

    await wrapper.find('[data-testid="knowledge-search"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="empty-keyword-tip"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('请输入关键词');
    expect(mockedList).toHaveBeenCalled();
    expect(wrapper.text()).toContain('校园卡遗失补办流程');
  });

  it('有结果时渲染标题、待核实标签与分类', async () => {
    mockedList.mockResolvedValue({ list: [item], total: 1, page: 1, pageSize: 10 });
    const wrapper = await mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('校园卡遗失补办流程');
    expect(wrapper.text()).toContain('待核实');
    expect(wrapper.text()).toContain('入学事务');
  });

  it('TC-03 无匹配结果:展示空状态引导文案', async () => {
    mockedList.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });
    const wrapper = await mountView();
    await flushPromises();
    expect(wrapper.find('[data-testid="knowledge-empty"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('未找到相关结果,换个关键词试试');
  });

  it('默认挂载按 page=1/pageSize=10 请求(契约 1.2 分页参数)', async () => {
    mockedList.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 });
    await mountView();
    await flushPromises();
    expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 10 }));
  });
});
