import request from 'supertest';
import { createApp } from '../src/app';
import { cleanupByMark, dateOffset, insertCategory, insertKnowledge, MARK } from './helpers';

const app = createApp();

let catId: number;

beforeAll(async () => {
  await cleanupByMark();
  catId = await insertCategory(`${MARK}知识列表分类`);
  await Promise.all([
    insertKnowledge({
      categoryId: catId,
      title: `${MARK}校园卡遗失补办流程`,
      content: '一、挂失;二、携带身份证到一卡通服务中心补办,工本费 20 元。',
      status: 'published',
      effectiveFrom: dateOffset(-30),
      effectiveUntil: dateOffset(30)
    }),
    insertKnowledge({
      categoryId: catId,
      title: `${MARK}已过期的秋季校历`,
      content: '本学期 9 月 1 日开学。',
      status: 'published',
      effectiveFrom: dateOffset(-60),
      effectiveUntil: dateOffset(-5)
    }),
    insertKnowledge({
      categoryId: catId,
      title: `${MARK}草稿状态的条目`,
      content: '草稿正文',
      status: 'draft',
      effectiveFrom: dateOffset(-1)
    }),
    insertKnowledge({
      categoryId: catId,
      title: `${MARK}待审核的条目`,
      content: '待审核正文',
      status: 'pending_review',
      effectiveFrom: dateOffset(-1)
    }),
    insertKnowledge({
      categoryId: catId,
      title: `${MARK}已下架的条目`,
      content: '已下架正文',
      status: 'takedown',
      effectiveFrom: dateOffset(-1)
    })
  ]);
});

afterAll(async () => {
  await cleanupByMark();
});

describe('知识列表(GET /api/knowledge,契约 2.3,M02)', () => {
  it('TC-02 空关键词:返回默认列表,HTTP 200 且 success=true,不异常', async () => {
    const res = await request(app).get('/api/knowledge');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.list)).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('page', 1);
    expect(res.body.data).toHaveProperty('pageSize', 10);
  });

  it('TC-01 有效关键词搜索:返回相关结果,含标题/分类摘要/来源/有效期', async () => {
    const res = await request(app).get(`/api/knowledge?keyword=${encodeURIComponent('校园卡遗失补办')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    const item = res.body.data.list.find((i: { title: string }) => i.title === `${MARK}校园卡遗失补办流程`);
    expect(item).toBeDefined();
    expect(item.categoryId).toBe(catId);
    expect(item.categoryName).toBe(`${MARK}知识列表分类`);
    expect(typeof item.summary).toBe('string');
    expect(item.summary.length).toBeLessThanOrEqual(81); // 80 字 + 省略号
    expect(item.source).toContain('测试来源');
    expect(item.effectiveUntil).toBe(dateOffset(30));
  });

  it('TC-03 不存在的关键词:返回空列表而非异常', async () => {
    const res = await request(app).get(`/api/knowledge?keyword=${encodeURIComponent('绝不存在关键词XYZ')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('TC-05 按分类筛选:结果仅含所选分类', async () => {
    const res = await request(app).get(`/api/knowledge?categoryId=${catId}&pageSize=100`);
    expect(res.status).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(2);
    for (const item of res.body.data.list) {
      expect(item.categoryId).toBe(catId);
    }
  });

  it('TC-09 学生端列表仅返回 published(草稿/待审核/下架均不可见)', async () => {
    const res = await request(app).get(`/api/knowledge?categoryId=${catId}&pageSize=100`);
    const titles = res.body.data.list.map((i: { title: string }) => i.title);
    expect(titles).toContain(`${MARK}校园卡遗失补办流程`);
    expect(titles).not.toContain(`${MARK}草稿状态的条目`);
    expect(titles).not.toContain(`${MARK}待审核的条目`);
    expect(titles).not.toContain(`${MARK}已下架的条目`);
  });

  it('分页参数:pageSize=2 返回 2 条且带分页元信息', async () => {
    const res = await request(app).get(`/api/knowledge?categoryId=${catId}&pageSize=2`);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.pageSize).toBe(2);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
  });

  it('400 分支:pageSize 超过 100 返回 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/knowledge?pageSize=101');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 分支:categoryId 不存在或停用返回 400', async () => {
    const res = await request(app).get('/api/knowledge?categoryId=999999');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('分类');
  });
});

describe('知识详情(GET /api/knowledge/:id,契约 2.4,M02)', () => {
  let validId: number;
  let expiredId: number;

  beforeAll(async () => {
    const rows = await request(app).get(`/api/knowledge?keyword=${encodeURIComponent(MARK)}&pageSize=100`);
    const list: Array<{ id: number; title: string }> = rows.body.data.list;
    validId = list.find((i) => i.title === `${MARK}校园卡遗失补办流程`)!.id;
    expiredId = list.find((i) => i.title === `${MARK}已过期的秋季校历`)!.id;
  });

  it('TC-04 打开知识详情:展示正文、来源、更新时间、状态', async () => {
    const res = await request(app).get(`/api/knowledge/${validId}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.content).toContain('一卡通服务中心');
    expect(d.source).toContain('测试来源');
    expect(d.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(d.status).toBe('published');
    expect(d.isExpired).toBe(false);
  });

  it('TC-09 已过期知识:仍可见且服务端返回 isExpired=true 与有效期字段', async () => {
    const res = await request(app).get(`/api/knowledge/${expiredId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.isExpired).toBe(true);
    expect(res.body.data.effectiveUntil).toBe(dateOffset(-5));
  });

  it('TC-09 不存在的知识 id:返回 404 与固定话术', async () => {
    const res = await request(app).get(`/api/knowledge/${999001}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('知识不存在或未发布');
  });

  it('TC-09 草稿与待审核知识:学生端访问返回 404', async () => {
    const draft = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}临时草稿详情`,
      content: 'x',
      status: 'draft',
      effectiveFrom: dateOffset(-1)
    });
    const res = await request(app).get(`/api/knowledge/${draft}`);
    expect(res.status).toBe(404);
  });

  it('400 分支:id 非法返回 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/knowledge/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
