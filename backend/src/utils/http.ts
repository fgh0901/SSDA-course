import type { Response } from 'express';

/** 统一成功响应包:{ success: true, data } */
export function ok(res: Response, data: unknown = null): void {
  res.json({ success: true, data });
}

/** 统一失败响应包:{ success: false, error: { code, message } } */
export function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

/** 业务可预期错误:抛出后由统一错误处理中间件转换为响应包 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
