import request from 'supertest';
import { createApp } from '../src/app';
import { cleanupByMark, insertCategory, MARK } from './helpers';

const app = createApp();

afterAll(async () => {
  await cleanupByMark();
});

describe('分类字典(GET /api/categories,契约 2.2,FR-01)', () => {
  it('TC-05 按分类筛选前置:返回启用分类,按 sortOrder 升序,不分页(list 结构)', async () => {
    await insertCategory(`${MARK}分类乙`, 2);
    await insertCategory(`${MARK}分类甲`, 1);
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.list)).toBe(true);
    const names = res.body.data.list.map((c: { name: string }) => c.name);
    const i1 = names.indexOf(`${MARK}分类甲`);
    const i2 = names.indexOf(`${MARK}分类乙`);
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i2).toBeGreaterThan(i1);
    expect(res.body.data.list[0]).toHaveProperty('sortOrder');
    expect(res.body.data.list[0]).toHaveProperty('isEnabled');
  });

  it('停用分类不出现在公开列表', async () => {
    await insertCategory(`${MARK}停用分类`, 99, 0);
    const res = await request(app).get('/api/categories');
    const names = res.body.data.list.map((c: { name: string }) => c.name);
    expect(names).not.toContain(`${MARK}停用分类`);
  });
});
