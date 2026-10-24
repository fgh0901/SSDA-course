import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, withDirectives } from 'vue';
import { mount } from '@vue/test-utils';

const { elMessageError } = vi.hoisted(() => ({ elMessageError: vi.fn() }));
vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>();
  return { ...actual, ElMessage: { ...actual.ElMessage, error: elMessageError } };
});

import { vDateGuard } from '@/utils/dateGuard';

// el-date-picker 非法手输守卫(GUI 验收 D-MED-2):指令在捕获阶段阻断非法日期提交。
// 注:直接对 element.value 赋值而不走 setValue,避免 test-utils 的 setValue 连带派发 change 事件。
const TestComp = defineComponent({
  name: 'DateGuardTest',
  setup: () => () => withDirectives(h('div', { class: 'picker-root' }, [h('input', { class: 'picker-input' })]), [[vDateGuard]])
});

function setRaw(wrapper: ReturnType<typeof mount>, value: string): void {
  (wrapper.find('input').element as HTMLInputElement).value = value;
}

function fireInputEvent(wrapper: ReturnType<typeof mount>, type: string, key?: string): boolean {
  const input = wrapper.find('input').element as HTMLInputElement;
  let propagated = false;
  input.parentElement?.addEventListener(type, () => { propagated = true; }); // 同元素冒泡段,被阻断则不触发
  input.dispatchEvent(
    key
      ? new KeyboardEvent(type, { key, bubbles: true })
      : new Event(type, { bubbles: true })
  );
  return propagated;
}

beforeEach(() => {
  elMessageError.mockClear();
});

describe('v-date-guard 日期非法手输守卫(D-MED-2)', () => {
  it('手输 2026-13-99 回车:阻断提交并提示"日期不合法"', () => {
    const wrapper = mount(TestComp);
    setRaw(wrapper, '2026-13-99');
    const propagated = fireInputEvent(wrapper, 'keydown', 'Enter');
    expect(propagated).toBe(false);
    expect(elMessageError).toHaveBeenCalledWith('日期不合法,请选择真实存在的日期');
  });

  it('手输 2026-13-99 后失焦提交(change):同样阻断', () => {
    const wrapper = mount(TestComp);
    setRaw(wrapper, '2026-13-99');
    const propagated = fireInputEvent(wrapper, 'change');
    expect(propagated).toBe(false);
    expect(elMessageError).toHaveBeenCalled();
  });

  it('手输 2026-02-30 后失焦(blur):EP 在捕获阶段监听 blur 提交,同样阻断(D-MED-2)', () => {
    const wrapper = mount(TestComp);
    setRaw(wrapper, '2026-02-30');
    const propagated = fireInputEvent(wrapper, 'blur');
    expect(propagated).toBe(false);
    expect(elMessageError).toHaveBeenCalledWith('日期不合法,请选择真实存在的日期');
  });

  it('合法日期(2027-04-09)回车:放行,不提示', () => {
    const wrapper = mount(TestComp);
    setRaw(wrapper, '2027-04-09');
    const propagated = fireInputEvent(wrapper, 'keydown', 'Enter');
    expect(propagated).toBe(true);
    expect(elMessageError).not.toHaveBeenCalled();
  });

  it('未输入完整日期(如 2026-1)或普通按键:放行不打扰输入', () => {
    const wrapper = mount(TestComp);
    setRaw(wrapper, '2026-1');
    expect(fireInputEvent(wrapper, 'keydown', 'Enter')).toBe(true);
    setRaw(wrapper, '2026-13-99');
    expect(fireInputEvent(wrapper, 'keydown', 'Backspace')).toBe(true); // 退格修改不被拦截
    expect(elMessageError).not.toHaveBeenCalled();
  });
});
