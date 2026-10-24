import { z } from 'zod';
import { DATE_RE, flagSchema, keywordSchema, paginationSchema, refineRealDate } from './common.schema';

/** 公开知识列表 query(契约 2.3) */
export const knowledgeQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  categoryId: z.coerce
    .number({ error: 'categoryId 必须为数字' })
    .int('categoryId 必须为整数')
    .positive('categoryId 必须为正整数')
    .optional()
});

/** 管理端知识列表 query(契约 3.2,状态可多值逗号分隔,缺省全部状态) */
export const adminKnowledgeQuerySchema = knowledgeQuerySchema.extend({
  status: z
    .string()
    .transform((s) => s.split(',').map((t) => t.trim()).filter(Boolean))
    .pipe(
      z.array(
        z.enum(['draft', 'pending_review', 'published', 'takedown'], {
          error: 'status 取值非法,应为 draft/pending_review/published/takedown'
        })
      )
    )
    .optional(),
  isVerified: z
    .union([z.literal('0'), z.literal('1')])
    .transform((v) => Number(v))
    .optional()
});

const knowledgeBase = {
  title: z.string({ error: '标题不能为空' }).trim().min(1, '标题不能为空').max(100, '标题最长 100 字符'),
  categoryId: z.coerce.number({ error: '分类不能为空' }).int().positive('分类不能为空'),
  content: z.string({ error: '正文不能为空' }).trim().min(1, '正文不能为空').max(20000, '正文最长 20000 字符'),
  source: z.string({ error: '来源不能为空' }).trim().min(1, '来源不能为空').max(200, '来源最长 200 字符'),
  effectiveFrom: refineRealDate(
    z.string({ error: '有效期起不能为空' }).regex(DATE_RE, '日期格式应为 YYYY-MM-DD(effectiveFrom)')
  ),
  effectiveUntil: refineRealDate(z.string().regex(DATE_RE, '日期格式应为 YYYY-MM-DD(effectiveUntil)')).optional(),
  isVerified: flagSchema.default(0)
};

/** 新增/编辑知识 body(契约 3.4/3.5,source 必填,TC-08) */
export const knowledgeUpsertSchema = z
  .object(knowledgeBase)
  .refine((v) => !v.effectiveUntil || v.effectiveUntil >= v.effectiveFrom, {
    message: '有效期止(effectiveUntil)不能早于有效期起(effectiveFrom)'
  });

/** 审核动作 body(契约 3.8) */
export const knowledgeReviewSchema = z
  .object({
    action: z.enum(['publish', 'reject'], { error: 'action 取值非法,应为 publish 或 reject' }),
    comment: z.string().trim().max(200, '备注最长 200 字符').optional()
  })
  .refine((v) => v.action !== 'reject' || (v.comment !== undefined && v.comment.length >= 1), {
    message: '驳回时必须填写备注(comment)'
  });

/** 过期工作台 query(契约 3.10;原控制器内联 schema 抽出统一走 validate 中间件,F4) */
export const expiredQuerySchema = z
  .object({
    state: z.enum(['expired', 'expiring'], { error: 'state 取值非法,应为 expired 或 expiring' }).optional(),
    days: z.coerce.number({ error: 'days 必须为数字' }).int('days 必须为整数').min(1, 'days 必须 ≥1').default(7)
  })
  .merge(paginationSchema);

export type KnowledgeQuery = z.infer<typeof knowledgeQuerySchema>;
export type AdminKnowledgeQuery = z.infer<typeof adminKnowledgeQuerySchema>;
export type KnowledgeUpsert = z.infer<typeof knowledgeUpsertSchema>;
export type KnowledgeReview = z.infer<typeof knowledgeReviewSchema>;
export type ExpiredQuery = z.infer<typeof expiredQuerySchema>;
