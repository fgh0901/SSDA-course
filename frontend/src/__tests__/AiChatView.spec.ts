import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';

const { aiChatMock, sessionIdMock } = vi.hoisted(() => ({
  aiChatMock: vi.fn(),
  sessionIdMock: vi.fn(() => '9b6f0c1e-5d3a-4a2b-8e9f-1c2d3e4f5a6b')
}));
vi.mock('@/api/ai', () => ({
  aiChat: aiChatMock,
  ensureAiSessionId: sessionIdMock
}));

import AiChatView from '@/views/student/AiChatView.vue';
import type { AiChatResponse } from '@/types/ai';

function mountView() {
  return mount(AiChatView, {
    global: {
      plugins: [ElementPlus],
      stubs: { RouterLink: { template: '<a><slot /></a>' } }
    }
  });
}

async function send(wrapper: ReturnType<typeof mountView>, message: string): Promise<void> {
  // el-input 会把 data-testid 透传到内部 textarea,直接按标签查找
  await wrapper.find('textarea').setValue(message);
  await wrapper.find('[data-testid="ai-send"]').trigger('click');
  await flushPromises();
}

beforeEach(() => {
  aiChatMock.mockReset();
  localStorage.clear();
});

describe('AI 助手对话页(FR-13)', () => {
  it('进入页面展示欢迎消息,sessionId 使用持久化的 uuid', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(sessionIdMock).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="ai-message-list"]').text()).toContain('新生校园知识库助手');
  });

  it('发送问题:请求携带 sessionId 与消息,渲染用户与 AI 消息', async () => {
    aiChatMock.mockResolvedValue({
      answer: '校园卡遗失后请先挂失,再携带身份证补办。',
      sources: [{ type: 'knowledge', id: 12, title: '校园卡遗失补办流程', source: '校信息化办公室官网' }],
      mode: 'deepseek',
      retriever: 'local_kb'
    } as AiChatResponse);
    const wrapper = mountView();
    await flushPromises();

    await send(wrapper, '校园卡丢了怎么补办?');

    expect(aiChatMock).toHaveBeenCalledWith({
      sessionId: '9b6f0c1e-5d3a-4a2b-8e9f-1c2d3e4f5a6b',
      message: '校园卡丢了怎么补办?'
    });
    expect(wrapper.text()).toContain('校园卡丢了怎么补办?');
    expect(wrapper.text()).toContain('校园卡遗失后请先挂失');
  });

  it('mode=fallback 时渲染降级提示条,来源列表可渲染', async () => {
    aiChatMock.mockResolvedValue({
      answer: '根据本地知识库检索结果(降级模式,仅供参考)。',
      sources: [{ type: 'knowledge', id: 12, title: '校园卡遗失补办流程', source: '官网' }],
      mode: 'fallback',
      retriever: 'local_kb'
    } as AiChatResponse);
    const wrapper = mountView();
    await flushPromises();

    await send(wrapper, '校园卡丢了怎么补办?');

    expect(wrapper.find('[data-testid="ai-fallback-tip"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('当前为降级模式');
    expect(wrapper.find('[data-testid="ai-sources"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('校园卡遗失补办流程');
  });

  it('sources=[](知识库未覆盖):回答话术原样展示,无来源列表', async () => {
    aiChatMock.mockResolvedValue({
      answer: '知识库未覆盖该问题,请咨询相关部门核实。',
      sources: [],
      mode: 'deepseek',
      retriever: 'local_kb'
    } as AiChatResponse);
    const wrapper = mountView();
    await flushPromises();

    await send(wrapper, '学校2027年校历是什么?');

    expect(wrapper.text()).toContain('知识库未覆盖该问题,请咨询相关部门核实。');
    expect(wrapper.find('[data-testid="ai-sources"]').exists()).toBe(false);
  });

  it('发送中防重复:请求未返回期间再次发送不会重复调用', async () => {
    let resolveChat!: (v: AiChatResponse) => void;
    aiChatMock.mockImplementation(
      () => new Promise<AiChatResponse>((resolve) => { resolveChat = resolve; })
    );
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('textarea').setValue('第一个问题');
    await wrapper.find('[data-testid="ai-send"]').trigger('click');
    await wrapper.find('[data-testid="ai-send"]').trigger('click');
    resolveChat({
      answer: '回答',
      sources: [],
      mode: 'deepseek',
      retriever: 'local_kb'
    });
    await flushPromises();

    expect(aiChatMock).toHaveBeenCalledTimes(1);
  });

  it('后端 400:展示 error.message(问题长度校验话术)', async () => {
    aiChatMock.mockRejectedValue({ code: 'VALIDATION_ERROR', message: '问题长度须为 1~500 字' });
    const wrapper = mountView();
    await flushPromises();

    await send(wrapper, 'x'.repeat(501));

    expect(wrapper.find('[data-testid="ai-message-content"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('问题长度须为 1~500 字');
  });

  it('空输入不发请求', async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('[data-testid="ai-send"]').trigger('click');
    expect(aiChatMock).not.toHaveBeenCalled();
  });
});
