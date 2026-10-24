import { z } from 'zod';
import { paginationSchema } from './common.schema';

export const SEARCH_TYPES = ['knowledge', 'service', 'activity', 'course', 'teacher', 'location'] as const;

/** GET /api/search 查询参数(契约 2.14,keyword 必填 1~50;原控制器内联 schema 抽出统一走 validate 中间件,F4) */
export const searchQuerySchema = z
  .object({
    keyword: z
      .string({ error: 'keyword 必须为字符串' })
      .transform((s) => s.trim())
      .pipe(z.string().min(1, 'keyword 不能为空,请输入关键词').max(50, 'keyword 最长 50 字符')),
    type: z
      .string()
      .transform((s) => s.split(',').map((t) => t.trim()).filter(Boolean))
      .pipe(
        z.array(
          z.enum(SEARCH_TYPES, {
            error: 'type 取值非法,应为 knowledge/service/activity/course/teacher/location'
          })
        )
      )
      .optional()
  })
  .merge(paginationSchema);

export type SearchQuery = z.infer<typeof searchQuerySchema>;
