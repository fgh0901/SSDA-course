import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';

// 状态标签组件(03-page-spec 第 2 节:draft=草稿/pending_review=待审核/published=已发布/takedown=已下架)
describe('StatusTag 状态标签', () => {
  const cases: Array<{ status: 'draft' | 'pending_review' | 'published' | 'takedown'; label: string }> = [
    { status: 'draft', label: '草稿' },
    { status: 'pending_review', label: '待审核' },
    { status: 'published', label: '已发布' },
    { status: 'takedown', label: '已下架' }
  ];

  it.each(cases)('$status → 显示 $label', ({ status, label }) => {
    const wrapper = mount(StatusTag, { props: { status }, global: { plugins: [ElementPlus] } });
    expect(wrapper.text()).toBe(label);
  });
});
