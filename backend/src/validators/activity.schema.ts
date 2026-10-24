import { z } from 'zod';
import { DATETIME_RE, flagSchema, keywordSchema, paginationSchema, refineRealDateTime } from './common.schema';

export const activityQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  time: z.enum(['upcoming', 'past'], { error: 'time 取值非法,应为 upcoming 或 past' }).optional()
});

export const adminActivityQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  isEnabled: z.union([z.literal('0'), z.literal('1')]).transform((v) => Number(v)).optional()
});

const locationIdField = z.coerce.number({ error: 'locationId 必须为数字' }).int().positive('locationId 必须为正整数').optional();

export const activityUpsertSchema = z
  .object({
    title: z.string({ error: '活动标题不能为空' }).trim().min(1, '活动标题不能为空').max(100, '活动标题最长 100 字符'),
    startTime: refineRealDateTime(
      z
        .string({ error: '开始时间不能为空' })
        .regex(DATETIME_RE, '开始时间(startTime)格式应为 YYYY-MM-DD HH:mm:ss')
    ),
    endTime: refineRealDateTime(
      z
        .string({ error: '结束时间不能为空' })
        .regex(DATETIME_RE, '结束时间(endTime)格式应为 YYYY-MM-DD HH:mm:ss')
    ),
    locationId: locationIdField,
    signupMethod: z.string().trim().max(200, '报名方式最长 200 字符').optional(),
    targetAudience: z.string().trim().max(200, '适用对象最长 200 字符').optional(),
    description: z.string().trim().max(2000, '活动说明最长 2000 字符').optional(),
    isEnabled: flagSchema.default(1)
  })
  .refine((v) => v.endTime >= v.startTime, {
    message: '结束时间(endTime)不能早于开始时间(startTime)'
  });

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type AdminActivityQuery = z.infer<typeof adminActivityQuerySchema>;
export type ActivityUpsert = z.infer<typeof activityUpsertSchema>;
