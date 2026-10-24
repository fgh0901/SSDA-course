import type { Directive } from 'vue';
import { ElMessage } from 'element-plus';
import { isDateString } from './datetime';

// 日期选择器非法手输守卫(GUI 验收 D-MED-2):
// el-date-picker 会把手输的 2026-13-99 按日历溢出规则静默解析为 2027-04-09 并正常提交,
// 表单规则(校验 model 值)无法感知原始输入。本指令在日期选择器根元素上以捕获阶段监听
// 内层 input 的 keydown(Enter)/change 事件——先于组件自身的提交处理,原始文本为
// "YYYY-MM-DD 完整日期前缀"且不是真实存在日期时阻断提交并提示。
// 点选日历面板的值始终合法,不受影响。

const DATE_PREFIX_RE = /^(\d{4}-\d{2}-\d{2})/;

function guard(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const raw = target.value.trim();
  const matched = DATE_PREFIX_RE.exec(raw);
  if (!matched) return; // 未输入完整日期部分(含清空/其他格式),交给组件自身处理
  if (isDateString(matched[1])) return;
  event.stopPropagation();
  event.preventDefault();
  ElMessage.error('日期不合法,请选择真实存在的日期');
}

function guardKeydown(event: Event): void {
  // 仅拦截 Enter 提交;其余按键放行,避免用户无法继续输入或退格修改
  if ((event as KeyboardEvent).key !== 'Enter') return;
  guard(event);
}

interface GuardHolder extends HTMLElement {
  __ssdaDateGuardChange?: EventListener;
  __ssdaDateGuardKeydown?: EventListener;
}

export const vDateGuard: Directive<GuardHolder> = {
  mounted(el) {
    el.__ssdaDateGuardChange = guard;
    el.__ssdaDateGuardKeydown = guardKeydown;
    el.addEventListener('change', guard, true);
    el.addEventListener('keydown', guardKeydown, true);
  },
  unmounted(el) {
    if (el.__ssdaDateGuardChange) el.removeEventListener('change', el.__ssdaDateGuardChange, true);
    if (el.__ssdaDateGuardKeydown) el.removeEventListener('keydown', el.__ssdaDateGuardKeydown, true);
  }
};
