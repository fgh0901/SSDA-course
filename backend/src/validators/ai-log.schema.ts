import { z } from 'zod';
import { paginationSchema } from './common.schema';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** AI 日志查询(契约 3.19) */
export const aiLogQuerySchema = paginationSchema.extend({
  sessionKey: z.string().trim().max(36, 'sessionKey 最长 36 字符').optional(),
  startDate: z.string().regex(DATE_RE, 'startDate 格式应为 YYYY-MM-DD').optional(),
  endDate: z.string().regex(DATE_RE, 'endDate 格式应为 YYYY-MM-DD').optional(),
  export: z.union([z.literal('0'), z.literal('1')]).optional()
});

export type AiLogQuery = z.infer<typeof aiLogQuerySchema>;
