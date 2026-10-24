import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../utils/http';

/**
 * zod 校验中间件工厂:校验通过后把解析结果挂到 res.locals,
 * 业务代码统一从 res.locals.body / res.locals.query 读取已校验数据。
 */
export function validate<TBody>(schema: ZodType<TBody>, source: 'body' | 'query' = 'body'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = source === 'body' ? req.body : req.query;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      next(new HttpError(400, 'VALIDATION_ERROR', `参数校验失败: ${detail}`));
      return;
    }
    res.locals[source] = parsed.data;
    next();
  };
}

/** 读取 validate 中间件写入的已校验数据 */
export function validated<T>(res: Response, key: 'body' | 'query' = 'body'): T {
  return res.locals[key] as T;
}
