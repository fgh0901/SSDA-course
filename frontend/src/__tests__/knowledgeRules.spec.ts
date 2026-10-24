import { describe, expect, it } from 'vitest';
import type { FormItemRule } from 'element-plus';
import {
  createKnowledgeRules,
  emptyKnowledgeForm,
  toKnowledgePayload,
  validateDateRange
} from '@/utils/knowledgeRules';

// 简易规则执行器:按 element-plus 规则语义依次执行 required/max/validator
interface SimpleRule {
  required?: boolean;
  message?: string | (() => string);
  max?: number;
  validator?: (rule: unknown, value: unknown, callback: (err?: Error) => void, source?: unknown, options?: unknown) => void;
}

function ruleMessage(rule: SimpleRule): string | undefined {
  return typeof rule.message === 'function' ? rule.message() : rule.message;
}

async function runRules(rules: FormItemRule[], value: unknown): Promise<string | undefined> {
  for (const raw of rules as SimpleRule[]) {
    const empty = value === undefined || value === null || value === '';
    if (raw.required && empty) return ruleMessage(raw);
    if (!empty) {
      if (raw.max && typeof value === 'string' && value.length > raw.max) return ruleMessage(raw);
      if (raw.validator) {
        const err = await new Promise<Error | void>((resolve) => {
          raw.validator?.({}, value, (e?: Error) => resolve(e));
        });
        if (err) return err.message;
      }
    }
  }
  return undefined;
}

describe('管理端知识表单校验规则(TC-08,与后端 zod 同口径)', () => {
  const rules = createKnowledgeRules();

  it('标题必填与长度上限', async () => {
    expect(await runRules(rules.title, '')).toBe('标题不能为空');
    expect(await runRules(rules.title, 'x'.repeat(101))).toBe('标题不能超过 100 字');
    expect(await runRules(rules.title, '校园卡遗失补办流程')).toBeUndefined();
  });

  it('来源必填与长度上限', async () => {
    expect(await runRules(rules.source, '')).toBe('来源不能为空');
    expect(await runRules(rules.source, 'x'.repeat(201))).toBe('来源不能超过 200 字');
    expect(await runRules(rules.source, '校信息化办公室官网')).toBeUndefined();
  });

  it('分类必选、正文必填', async () => {
    expect(await runRules(rules.categoryId, undefined)).toBe('分类不能为空');
    expect(await runRules(rules.content, '')).toBe('正文不能为空');
  });

  it('日期格式校验:非法格式提示"日期格式应为 YYYY-MM-DD"', async () => {
    const fromRule = rules.effectiveFrom;
    expect(await runRules(fromRule, '')).toBe('有效期起不能为空');
    expect(await runRules(fromRule, '2026/09/01')).toBe('日期格式应为 YYYY-MM-DD');
    expect(await runRules(fromRule, '2026-9-1')).toBe('日期格式应为 YYYY-MM-DD');
    expect(await runRules(fromRule, '2026-09-01')).toBeUndefined();
  });

  it('有效期止:可空,填值时也须为 YYYY-MM-DD', async () => {
    expect(await runRules(rules.effectiveUntil, '')).toBeUndefined();
    expect(await runRules(rules.effectiveUntil, '2026-13-40')).toBe('日期格式应为 YYYY-MM-DD');
    expect(await runRules(rules.effectiveUntil, '2027-07-15')).toBeUndefined();
  });

  it('跨字段校验:有效期止不得早于有效期起', () => {
    const form = { ...emptyKnowledgeForm(), effectiveFrom: '2026-09-01', effectiveUntil: '2026-08-31' };
    expect(validateDateRange(form)).toBe('有效期止不能早于有效期起');
    const okForm = { ...emptyKnowledgeForm(), effectiveFrom: '2026-09-01', effectiveUntil: '2026-09-01' };
    expect(validateDateRange(okForm)).toBe('');
  });

  it('表单转契约 payload:空 effectiveUntil 置为 undefined', () => {
    const form = { ...emptyKnowledgeForm(), title: 'T', categoryId: 1, content: 'C', source: 'S', effectiveFrom: '2026-09-01' };
    const payload = toKnowledgePayload(form);
    expect(payload).toMatchObject({ title: 'T', categoryId: 1, source: 'S', effectiveFrom: '2026-09-01' });
    expect(payload.effectiveUntil).toBeUndefined();
  });
});
