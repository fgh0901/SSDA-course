import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as categoryService from '../services/category.service';
import type { CategoryUpsert } from '../validators/category.schema';
import { idParamSchema } from '../validators/common.schema';

/** GET /api/categories(契约 2.2,全量例外不分页) */
export async function listPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await categoryService.listPublic());
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/categories(契约 3.12) */
export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await categoryService.listAdmin());
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/categories(契约 3.12) */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<CategoryUpsert>(res, 'body');
    ok(res, await categoryService.create(input));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/categories/:id(契约 3.12) */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<CategoryUpsert>(res, 'body');
    await categoryService.update(id, input);
    ok(res, { id });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/categories/:id(契约 3.12,引用 409) */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await categoryService.remove(id));
  } catch (err) {
    next(err);
  }
}
