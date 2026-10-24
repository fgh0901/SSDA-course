import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as knowledgeService from '../services/knowledge.service';
import type { KnowledgeQuery } from '../validators/knowledge.schema';
import { idParamSchema } from '../validators/common.schema';

/** GET /api/knowledge(契约 2.3) */
export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<KnowledgeQuery>(res, 'query');
    ok(res, await knowledgeService.list(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/knowledge/:id(契约 2.4) */
export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await knowledgeService.detailPublic(id));
  } catch (err) {
    next(err);
  }
}
