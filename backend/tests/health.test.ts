import request from 'supertest';
import { createApp } from '../src/app';

describe('健康检查(GET /api/health,契约 2.1)', () => {
  it('返回 200,包含 status=ok 与 db 探测结果', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(['up', 'down']).toContain(res.body.data.db);
    expect(res.body.data.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('测试库可用时 db 为 up', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.body.data.db).toBe('up');
  });
});

describe('未知接口', () => {
  it('返回 404 统一错误包', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
