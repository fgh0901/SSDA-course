import type { FormItemRule } from 'element-plus';
import { isDateString } from './datetime';

// 知识表单模型(契约 3.4/3.5 字段)
export interface KnowledgeFormModel {
  title: string;
  categoryId: number | undefined;
  content: string;
  source: string;
  effectiveFrom: string;
  effectiveUntil: string;
  isVerified: 0 | 1;
}

export function emptyKnowledgeForm(): KnowledgeFormModel {
  return { title: '', categoryId: undefined, content: '', source: '', effectiveFrom: '', effectiveUntil: '', isVerified: 0 };
}

// 管理端知识表单校验规则(03-page-spec 4.2,与后端 zod 同口径,TC-08)
export function createKnowledgeRules(): Record<string, FormItemRule[]> {
  return {
    title: [
      { required: true, message: '标题不能为空', trigger: 'blur' },
      { max: 100, message: '标题不能超过 100 字', trigger: 'blur' }
    ],
    categoryId: [{ required: true, message: '分类不能为空', trigger: 'change' }],
    content: [
      { required: true, message: '正文不能为空', trigger: 'blur' },
      { max: 20000, message: '正文不能超过 20000 字', trigger: 'blur' }
    ],
    source: [
      { required: true, message: '来源不能为空', trigger: 'blur' },
      { max: 200, message: '来源不能超过 200 字', trigger: 'blur' }
    ],
    effectiveFrom: [
      { required: true, message: '有效期起不能为空', trigger: 'change' },
      {
        validator: (_rule, value: string, callback: (err?: Error) => void) => {
          if (!value || isDateString(value)) callback();
          else callback(new Error('日期格式应为 YYYY-MM-DD'));
        },
        trigger: 'change'
      }
    ],
    effectiveUntil: [
      {
        validator: (_rule, value: string, callback: (err?: Error) => void) => {
          if (!value) callback();
          else if (!isDateString(value)) callback(new Error('日期格式应为 YYYY-MM-DD'));
          else callback();
        },
        trigger: 'change'
      }
    ]
  };
}

/** 有效期止不得早于有效期起(跨字段校验,表单提交前调用) */
export function validateDateRange(form: KnowledgeFormModel): string {
  if (form.effectiveFrom && form.effectiveUntil && form.effectiveUntil < form.effectiveFrom) {
    return '有效期止不能早于有效期起';
  }
  return '';
}

/** 表单 → 契约 3.4/3.5 payload */
export function toKnowledgePayload(form: KnowledgeFormModel) {
  return {
    title: form.title,
    categoryId: form.categoryId as number,
    content: form.content,
    source: form.source,
    effectiveFrom: form.effectiveFrom,
    effectiveUntil: form.effectiveUntil || undefined,
    isVerified: form.isVerified
  };
}
