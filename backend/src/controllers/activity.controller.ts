import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as activityService from '../services/activity.service';
import type { ActivityQuery, ActivityUpsert, AdminActivityQuery } from '../validators/activity.schema';
import { idParamSchema } from '../validators/common.schema';

/** GET /api/activities(契约 2.7) */
export async function listPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<ActivityQuery>(res, 'query');
    ok(res, await activityService.listPublic(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/activities/:id(契约 2.8) */
export async function detailPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await activityService.detailPublic(id));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/activities(契约 3.14) */
export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<AdminActivityQuery>(res, 'query');
    ok(res, await activityService.listAdmin(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/activities/:id(编辑回显) */
export async function detailAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await activityService.detailAdmin(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/activities(契约 3.14) */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<ActivityUpsert>(res, 'body');
    ok(res, await activityService.create(input));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/activities/:id(契约 3.14) */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<ActivityUpsert>(res, 'body');
    await activityService.update(id, input);
    ok(res, { id });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/activities/:id(契约 3.14,直接删除) */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await activityService.remove(id));
  } catch (err) {
    next(err);
  }
}
