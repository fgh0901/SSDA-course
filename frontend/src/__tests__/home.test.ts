import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeView from '../views/HomeView.vue';

describe('HomeView', () => {
  it('渲染系统标题', () => {
    const wrapper = mount(HomeView);
    expect(wrapper.text()).toContain('新生校园知识库与入学事务辅助系统');
  });
});
