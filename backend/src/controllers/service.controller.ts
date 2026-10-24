import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as serviceGuideService from '../services/service-guide.service';
import type { AdminServiceQuery, ServiceQuery, ServiceUpsert } from '../validators/service.schema';
import { idParamSchema } from '../validators/common.schema';

/** GET /api/services(契约 2.5) */
export async function listPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<ServiceQuery>(res, 'query');
    ok(res, await serviceGuideService.listPublic(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/services/:id(契约 2.6) */
export async function detailPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await serviceGuideService.detailPublic(id));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/services(契约 3.13) */
export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<AdminServiceQuery>(res, 'query');
    ok(res, await serviceGuideService.listAdmin(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/services/:id(编辑回显) */
export async function detailAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await serviceGuideService.detailAdmin(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/services(契约 3.13) */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<ServiceUpsert>(res, 'body');
    ok(res, await serviceGuideService.create(input));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/services/:id(契约 3.13) */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<ServiceUpsert>(res, 'body');
    await serviceGuideService.update(id, input);
    ok(res, { id });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/services/:id(契约 3.13,直接删除) */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await serviceGuideService.remove(id));
  } catch (err) {
    next(err);
  }
}
