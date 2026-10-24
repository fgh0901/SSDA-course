import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/health', () => {
  it('返回服务健康状态', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('up');
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
