import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType, ZodError } from 'zod';
import { HttpError } from '../utils/http';

/** 把 zod issue 转成可直接展示的中文消息(TC-08:message 指明具体字段) */
export function issueToMessage(issue: { code: string; message: string; keys?: string[] }): string {
  if (issue.code === 'unrecognized_keys' && issue.keys && issue.keys.length > 0) {
    return `包含不允许提交的字段: ${issue.keys.join(', ')}`;
  }
  return issue.message;
}

/** ZodError → 400 VALIDATION_ERROR(controller 内直接 parse 抛错时统一走这里) */
export function zodToHttpError(err: ZodError): HttpError {
  const detail = err.issues.map(issueToMessage).join('; ');
  return new HttpError(400, 'VALIDATION_ERROR', detail || '参数校验失败');
}

/**
 * zod 校验中间件工厂:校验通过后把解析结果挂到 res.locals,
 * 业务代码统一从 res.locals.body / res.locals.query / res.locals.params 读取已校验数据。
 */
export function validate<TSchema extends ZodType>(
  schema: TSchema,
  source: 'body' | 'query' | 'params' = 'body'
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues.map(issueToMessage).join('; ');
      next(new HttpError(400, 'VALIDATION_ERROR', detail || '参数校验失败'));
      return;
    }
    res.locals[source] = parsed.data;
    next();
  };
}

/** 读取 validate 中间件写入的已校验数据 */
export function validated<T>(res: Response, key: 'body' | 'query' | 'params' = 'body'): T {
  return res.locals[key] as T;
}
