import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import { getAdmin } from '../middlewares/auth';
import * as authService from '../services/auth.service';
import * as knowledgeService from '../services/knowledge.service';
import type { AdminKnowledgeQuery, KnowledgeReview, KnowledgeUpsert } from '../validators/knowledge.schema';
import type { LoginInput } from '../validators/auth.schema';
import { paginationSchema } from '../validators/common.schema';
import { idParamSchema } from '../validators/common.schema';
import { z } from 'zod';

/** POST /api/admin/auth/login(契约 3.1) */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<LoginInput>(res, 'body');
    ok(res, await authService.login(input));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/knowledge(契约 3.2,缺省全部状态) */
export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<AdminKnowledgeQuery>(res, 'query');
    ok(res, await knowledgeService.listAdmin(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/knowledge/expired(契约 3.10;注册顺序须先于 /:id) */
export async function expired(req: Request, res: Response, next: NextFunction) {
  try {
    const q = z
      .object({
        state: z.enum(['expired', 'expiring'], { error: 'state 取值非法,应为 expired 或 expiring' }).optional(),
        days: z.coerce.number({ error: 'days 必须为数字' }).int('days 必须为整数').min(1, 'days 必须 ≥1').default(7)
      })
      .merge(paginationSchema)
      .parse(req.query);
    ok(res, await knowledgeService.listExpired(q.state, q.days, q.page, q.pageSize));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/knowledge/:id(契约 3.3) */
export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await knowledgeService.detailAdmin(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/knowledge(契约 3.4,TC-06/08) */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<KnowledgeUpsert>(res, 'body');
    ok(res, await knowledgeService.create(input, getAdmin(req).id));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/knowledge/:id(契约 3.5) */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<KnowledgeUpsert>(res, 'body');
    ok(res, await knowledgeService.update(id, input, getAdmin(req).id));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/knowledge/:id(契约 3.6,仅 draft 可删) */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await knowledgeService.remove(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/knowledge/:id/submit-review(契约 3.7) */
export async function submitReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await knowledgeService.submitReview(id, getAdmin(req).id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/knowledge/:id/review(契约 3.8) */
export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<KnowledgeReview>(res, 'body');
    ok(res, await knowledgeService.review(id, input.action, input.comment, getAdmin(req).id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/knowledge/:id/takedown(契约 3.9) */
export async function takedown(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await knowledgeService.takedown(id, getAdmin(req).id));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/knowledge/:id/change-logs(契约 3.11) */
export async function changeLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10)
      })
      .parse(req.query);
    ok(res, await knowledgeService.changeLogs(id, q.page, q.pageSize));
  } catch (err) {
    next(err);
  }
}
