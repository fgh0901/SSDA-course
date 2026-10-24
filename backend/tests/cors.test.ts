/**
 * CORS 白名单测试(体检修复 F5/审计 A-02:收敛为 CORS_ORIGIN 白名单,逗号分隔多个)
 */
import request from 'supertest';
import type { Express } from 'express';

const ALLOWED = 'http://localhost:5173,http://localhost:5174';

let app: Express;

beforeAll(async () => {
  // 在模块加载前设置多 origin 配置,验证 env.CORS_ORIGIN.split(',') 生效
  process.env.CORS_ORIGIN = ALLOWED;
  jest.resetModules();
  const mod = await import('../src/app');
  app = mod.createApp();
});

afterAll(() => {
  delete process.env.CORS_ORIGIN;
});

describe('CORS 白名单(F5)', () => {
  it('白名单 origin:响应携带 Access-Control-Allow-Origin(路由未命中也输出 CORS 头)', async () => {
    const res = await request(app).get('/api/not-exist').set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(404);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('多 origin 配置:第二个白名单 origin 同样放行', async () => {
    const res = await request(app).get('/api/not-exist').set('Origin', 'http://localhost:5174');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174');
  });

  it('非白名单 origin:不携带 Access-Control-Allow-Origin(由浏览器侧拒绝)', async () => {
    const res = await request(app).get('/api/not-exist').set('Origin', 'http://evil.example');
    expect(res.status).toBe(404);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('预检请求:白名单 204 放行;非白名单无允许头', async () => {
    const allowed = await request(app)
      .options('/api/ai/chat')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const denied = await request(app)
      .options('/api/ai/chat')
      .set('Origin', 'http://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
