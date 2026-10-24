import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import * as searchService from '../services/search.service';
import type { SearchType } from '../services/search.service';
import { paginationSchema } from '../validators/common.schema';
import { z } from 'zod';

const SEARCH_TYPES = ['knowledge', 'service', 'activity', 'course', 'teacher', 'location'] as const;

/** GET /api/search(契约 2.14,keyword 必填 1~50,TC-01/02/03) */
export async function aggregate(req: Request, res: Response, next: NextFunction) {
  try {
    const q = z
      .object({
        keyword: z
          .string({ error: 'keyword 必须为字符串' })
          .transform((s) => s.trim())
          .pipe(z.string().min(1, 'keyword 不能为空,请输入关键词').max(50, 'keyword 最长 50 字符')),
        type: z
          .string()
          .transform((s) => s.split(',').map((t) => t.trim()).filter(Boolean))
          .pipe(
            z.array(z.enum(SEARCH_TYPES, {
              error: 'type 取值非法,应为 knowledge/service/activity/course/teacher/location'
            }))
          )
          .optional()
      })
      .merge(paginationSchema)
      .parse(req.query);
    ok(res, await searchService.aggregate(q.keyword, q.type as SearchType[] | undefined, q.page, q.pageSize));
  } catch (err) {
    next(err);
  }
}
