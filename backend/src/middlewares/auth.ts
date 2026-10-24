import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

export interface AdminPayload {
  id: number;
  username: string;
  role: string;
}

export function signToken(payload: AdminPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  } as jwt.SignOptions);
}

/** 管理接口守卫:校验 Bearer 凭证与 admin 角色(TC-07) */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(401, 'UNAUTHORIZED', '未登录或凭证缺失'));
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as AdminPayload;
    if (payload.role !== 'admin') {
      next(new HttpError(403, 'FORBIDDEN', '无权访问该资源'));
      return;
    }
    (req as Request & { admin?: AdminPayload }).admin = payload;
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', '凭证无效或已过期'));
  }
};

/** 从请求上读取已验证的管理员身份(requireAdmin 之后使用) */
export function getAdmin(req: Request): AdminPayload {
  return (req as Request & { admin?: AdminPayload }).admin as AdminPayload;
}
