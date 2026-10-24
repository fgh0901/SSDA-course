/**
 * TC-10:数据库不可用时,业务接口返回 500 统一话术,不泄露堆栈/连接串/凭据;
 * /api/health 仍返回 200 且 db:"down"。
 * 本文件通过 jest.mock 将 db 层替换为始终抛 ECONNREFUSED 错误的实现。
 */
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  insert: jest.fn(),
  execute: jest.fn(),
  withTransaction: jest.fn(),
  getPool: jest.fn(),
  closePool: jest.fn()
}));

import request from 'supertest';
import { createApp } from '../src/app';
import * as db from '../src/config/db';

const dbDownError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' });

beforeAll(() => {
  (db.query as jest.Mock).mockRejectedValue(dbDownError);
  (db.queryOne as jest.Mock).mockRejectedValue(dbDownError);
  (db.insert as jest.Mock).mockRejectedValue(dbDownError);
  (db.execute as jest.Mock).mockRejectedValue(dbDownError);
  (db.withTransaction as jest.Mock).mockRejectedValue(dbDownError);
});

describe('TC-10 数据库连接不可用(M08/NFR 安全红线)', () => {
  it('业务接口返回 500 与统一话术"系统繁忙,请稍后重试"', async () => {
    const res = await request(createApp()).get('/api/knowledge');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('系统繁忙,请稍后重试');
  });

  it('写接口同样 500(登录分支)', async () => {
    const res = await request(createApp())
      .post('/api/admin/auth/login')
      .send({ username: 'someone', password: 'whatever1' });
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('系统繁忙,请稍后重试');
  });

  it('/api/health 仍返回 200,db:"down"(供运维判断)', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db).toBe('down');
  });

  it('反向验证:响应不泄露堆栈、ECONNREFUSED、主机与凭据', async () => {
    const res = await request(createApp()).get('/api/knowledge?keyword=x');
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('ECONNREFUSED');
    expect(text).not.toContain('stack');
    expect(text).not.toContain('127.0.0.1');
    expect(text).not.toContain('password');
    expect(text).not.toContain('201410');
  });
});
