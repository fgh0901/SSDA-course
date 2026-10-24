import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../utils/http';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `接口不存在: ${req.method} ${req.path}` }
  });
};

/**
 * 统一错误处理:业务错误按 HttpError 输出;未知错误只记录日志,
 * 向客户端返回统一提示,不泄露堆栈与连接凭据(TC-10)。
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message }
    });
    return;
  }
  console.error('[unhandled]', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '系统繁忙,请稍后重试' }
  });
};
