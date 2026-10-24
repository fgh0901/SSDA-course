import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as searchService from '../services/search.service';
import type { SearchType } from '../services/search.service';
import type { SearchQuery } from '../validators/search.schema';

/** GET /api/search(契约 2.14,keyword 必填 1~50,TC-01/02/03;校验走路由级 validate 中间件,F4) */
export async function aggregate(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<SearchQuery>(res, 'query');
    ok(res, await searchService.aggregate(q.keyword, q.type as SearchType[] | undefined, q.page, q.pageSize));
  } catch (err) {
    next(err);
  }
}
