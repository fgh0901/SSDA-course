import { z } from 'zod';

/** 公共分页参数(契约 1.2:page 从 1 起,pageSize 默认 10 上限 100) */
export const paginationSchema = z.object({
  page: z.coerce
    .number({ error: 'page 必须为数字' })
    .int('page 必须为整数')
    .min(1, 'page 必须 ≥1')
    .default(1),
  pageSize: z.coerce
    .number({ error: 'pageSize 必须为数字' })
    .int('pageSize 必须为整数')
    .min(1, 'pageSize 必须 ≥1')
    .max(100, 'pageSize 最大为 100')
    .default(10)
});

/** 公共关键词参数:去空格后 ≤50 字符,空串视为未传(TC-02) */
export const keywordSchema = z
  .string({ error: 'keyword 必须为字符串' })
  .trim()
  .max(50, 'keyword 最长 50 字符')
  .optional();

/** 路径参数 id(正整数) */
export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'id 必须为数字' })
    .int('id 必须为整数')
    .positive('id 必须为正整数')
});

/** 是否启用/上架/核实字段:0 或 1 */
export const flagSchema = z.union([z.literal(0), z.literal(1)]);
