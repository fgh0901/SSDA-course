import bcrypt from 'bcryptjs';
import * as adminUserDao from '../dao/admin-user.dao';
import { signToken } from '../middlewares/auth';
import { HttpError } from '../utils/http';
import type { LoginInput } from '../validators/auth.schema';

/**
 * 管理员登录(契约 3.1):bcrypt 校验,统一 401 话术
 * 不区分"账号不存在"与"密码错误",响应不回传密码哈希
 */
export async function login(input: LoginInput): Promise<{ token: string; admin: { id: number; username: string; role: string } }> {
  const user = await adminUserDao.findByUsername(input.username);
  const matched = user !== null && bcrypt.compareSync(input.password, user.passwordHash);
  if (!matched) {
    throw new HttpError(401, 'UNAUTHORIZED', '用户名或密码错误');
  }
  await adminUserDao.updateLastLogin(user.id);
  const admin = { id: user.id, username: user.username, role: user.role };
  return { token: signToken(admin), admin };
}
