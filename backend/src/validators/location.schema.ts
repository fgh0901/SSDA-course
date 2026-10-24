import { z } from 'zod';
import { keywordSchema, paginationSchema } from './common.schema';

export const locationQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  campus: z.string().trim().max(50, 'campus 最长 50 字符').optional(),
  building: z.string().trim().max(100, 'building 最长 100 字符').optional(),
  floor: z.string().trim().max(20, 'floor 最长 20 字符').optional()
});

export const locationUpsertSchema = z.object({
  name: z.string({ error: '地点名称不能为空' }).trim().min(1, '地点名称不能为空').max(100, '地点名称最长 100 字符'),
  campus: z.string({ error: '校区不能为空' }).trim().min(1, '校区不能为空').max(50, '校区最长 50 字符'),
  building: z.string().trim().max(100, '建筑名最长 100 字符').optional(),
  floor: z.string().trim().max(20, '楼层最长 20 字符').optional(),
  room: z.string().trim().max(50, '房间号最长 50 字符').optional(),
  description: z.string().trim().max(500, '地点说明最长 500 字符').optional()
});

export type LocationQuery = z.infer<typeof locationQuerySchema>;
export type LocationUpsert = z.infer<typeof locationUpsertSchema>;
