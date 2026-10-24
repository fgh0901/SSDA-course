import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string({ error: '用户名不能为空' }).trim().min(3, '用户名长度须为 3~30 字符').max(30, '用户名长度须为 3~30 字符'),
  password: z.string({ error: '密码不能为空' }).min(6, '密码长度须为 6~64 字符').max(64, '密码长度须为 6~64 字符')
});

export type LoginInput = z.infer<typeof loginSchema>;
