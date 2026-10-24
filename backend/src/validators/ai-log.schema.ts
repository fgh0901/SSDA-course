import { z } from 'zod';
import { DATE_RE, paginationSchema, refineRealDate } from './common.schema';

/** AI 日志查询(契约 3.19) */
export const aiLogQuerySchema = paginationSchema.extend({
  sessionKey: z.string().trim().max(36, 'sessionKey 最长 36 字符').optional(),
  startDate: refineRealDate(z.string().regex(DATE_RE, 'startDate 格式应为 YYYY-MM-DD')).optional(),
  endDate: refineRealDate(z.string().regex(DATE_RE, 'endDate 格式应为 YYYY-MM-DD')).optional(),
  export: z.union([z.literal('0'), z.literal('1')]).optional()
});

export type AiLogQuery = z.infer<typeof aiLogQuerySchema>;
