import { z } from 'zod';
import { flagSchema } from './common.schema';

export const categoryUpsertSchema = z.object({
  name: z.string({ error: '分类名称不能为空' }).trim().min(1, '分类名称不能为空').max(50, '分类名称最长 50 字符'),
  description: z.string().trim().max(200, '分类说明最长 200 字符').optional(),
  sortOrder: z.coerce.number({ error: 'sortOrder 必须为数字' }).int('sortOrder 必须为整数').default(0),
  isEnabled: flagSchema.default(1)
});

export type CategoryUpsert = z.infer<typeof categoryUpsertSchema>;
