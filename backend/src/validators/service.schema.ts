import { z } from 'zod';
import { flagSchema, keywordSchema, paginationSchema } from './common.schema';

export const serviceQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  locationId: z.coerce.number({ error: 'locationId 必须为数字' }).int().positive('locationId 必须为正整数').optional()
});

export const adminServiceQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  isEnabled: z.union([z.literal('0'), z.literal('1')]).transform((v) => Number(v)).optional()
});

const locationIdField = z.coerce.number({ error: 'locationId 必须为数字' }).int().positive('locationId 必须为正整数').optional();

export const serviceUpsertSchema = z.object({
  title: z.string({ error: '标题不能为空' }).trim().min(1, '标题不能为空').max(100, '标题最长 100 字符'),
  department: z.string({ error: '办理部门不能为空' }).trim().min(1, '办理部门不能为空').max(100, '办理部门最长 100 字符'),
  locationId: locationIdField,
  serviceTime: z.string().trim().max(100, '办理时间最长 100 字符').optional(),
  materials: z.string().trim().max(2000, '所需材料最长 2000 字符').optional(),
  process: z.string().trim().max(2000, '办理流程最长 2000 字符').optional(),
  isEnabled: flagSchema.default(1)
});

export type ServiceQuery = z.infer<typeof serviceQuerySchema>;
export type AdminServiceQuery = z.infer<typeof adminServiceQuerySchema>;
export type ServiceUpsert = z.infer<typeof serviceUpsertSchema>;
