import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as locationService from '../services/location.service';
import type { LocationQuery, LocationUpsert } from '../validators/location.schema';
import { idParamSchema } from '../validators/common.schema';

/** GET /api/locations(契约 2.9) */
export async function listPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<LocationQuery>(res, 'query');
    ok(res, await locationService.list(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/locations/:id */
export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await locationService.detail(id));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/locations(契约 3.15) */
export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<LocationQuery>(res, 'query');
    ok(res, await locationService.listAdmin(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/locations/:id(契约 3.15 v1.1,编辑回显) */
export async function detailAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await locationService.detailAdmin(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/locations(契约 3.15) */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<LocationUpsert>(res, 'body');
    ok(res, await locationService.create(input));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/locations/:id(契约 3.15) */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<LocationUpsert>(res, 'body');
    await locationService.update(id, input);
    ok(res, { id });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/locations/:id(契约 3.15,被引用 409) */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await locationService.remove(id));
  } catch (err) {
    next(err);
  }
}
