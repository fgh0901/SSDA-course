import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { cleanupByMark, createAdmin, MARK } from './helpers';

const app = createApp();
const USERNAME = `${MARK}admin-auth`;
const PASSWORD = 'test-pass-123';
let token: string;

beforeAll(async () => {
  await cleanupByMark();
  await createAdmin(USERNAME, PASSWORD);
});

afterAll(async () => {
  await cleanupByMark();
});

describe('管理员登录(POST /api/admin/auth/login,契约 3.1,M08)', () => {
  it('正确凭据:返回 token 与管理员信息,响应不含密码哈希', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ username: USERNAME, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.admin).toEqual({ id: expect.any(Number), username: USERNAME, role: 'admin' });
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
    token = res.body.data.token;
  });

  it('密码错误:401 统一话术"用户名或密码错误",不区分账号与密码', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ username: USERNAME, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('用户名或密码错误');
  });

  it('账号不存在:同样 401"用户名或密码错误"', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ username: 'no-such-user-xyz', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('用户名或密码错误');
  });

  it('400 分支:字段缺失或长度非法返回 VALIDATION_ERROR 且指明字段', async () => {
    const missing = await request(app).post('/api/admin/auth/login').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.message).toContain('用户名');

    const shortPwd = await request(app).post('/api/admin/auth/login').send({ username: USERNAME, password: '123' });
    expect(shortPwd.status).toBe(400);
    expect(shortPwd.body.error.message).toContain('密码');
  });
});

describe('管理接口服务端权限(TC-07,FR-07,M08)', () => {
  it('TC-07 未携带 token 调用管理接口:401 服务端拒绝', async () => {
    const res = await request(app).get('/api/admin/knowledge');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('TC-07 token 无效或被篡改:401', async () => {
    const res = await request(app)
      .get('/api/admin/knowledge')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('TC-07 已登录但角色非 admin:403 FORBIDDEN', async () => {
    const forged = jwt.sign({ id: 999, username: 'student-x', role: 'student' }, env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/admin/knowledge').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('TC-07 有效 token 访问管理接口:放行(对照分支)', async () => {
    const res = await request(app).get('/api/admin/knowledge').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('TC-07 各管理端点均受保护(抽样:categories/services/ai-logs CRUD 入口)', async () => {
    for (const [method, path] of [
      ['GET', '/api/admin/categories'],
      ['POST', '/api/admin/categories'],
      ['DELETE', '/api/admin/knowledge/1'],
      ['GET', '/api/admin/ai-logs'],
      ['POST', '/api/admin/knowledge/1/review']
    ] as const) {
      const res = await request(app)[method.toLowerCase() as 'get' | 'post' | 'delete'](path);
      expect(res.status).toBe(401);
    }
  });
});
