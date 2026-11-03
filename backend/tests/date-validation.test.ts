import request from 'supertest';
import { createApp } from '../src/app';
import { activityUpsertSchema } from '../src/validators/activity.schema';
import { aiLogQuerySchema } from '../src/validators/ai-log.schema';
import { knowledgeUpsertSchema } from '../src/validators/knowledge.schema';
import { cleanupByMark, createAdmin, insertCategory, login, MARK } from './helpers';

const app = createApp();
const USERNAME = `${MARK}admin-date`;
const PASSWORD = 'test-pass-123';
let token = '';
let catId = 0;

beforeAll(async () => {
  await cleanupByMark();
  await createAdmin(USERNAME, PASSWORD);
  token = await login(app, USERNAME, PASSWORD);
  catId = await insertCategory(`${MARK}日期校验分类`);
});

afterAll(async () => {
  await cleanupByMark();
});

describe('真实日历日期校验(F1,D-MED-2 后端侧)', () => {
  const knowledgeBase = {
    title: `${MARK}日期校验条目`,
    content: 'GUI 验收配套测试正文',
    source: '测试来源(自动化用例)'
  };

  it('D-MED-2 effectiveFrom=2026-13-99:新增知识被 400 拦截,提示不是真实存在的日期', async () => {
    const res = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...knowledgeBase, categoryId: catId, effectiveFrom: '2026-13-99' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('2026-13-99');
    expect(res.body.error.message).toContain('不是真实存在的日期');
  });

  it('D-MED-2 effectiveUntil=2026-02-30(2 月无 30 日):新增知识被 400 拦截', async () => {
    const res = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...knowledgeBase, categoryId: catId, effectiveFrom: '2026-02-01', effectiveUntil: '2026-02-30' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('不是真实存在的日期');
  });

  it('活动 startTime=2026-02-30 10:00:00(日期部分不真实):新增活动被 400 拦截', async () => {
    const res = await request(app)
      .post('/api/admin/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}日期校验活动`,
        startTime: '2026-02-30 10:00:00',
        endTime: '2026-03-01 12:00:00'
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('不是真实存在的日期');
  });

  it('合法日期 2026-02-28 通过校验:schema 层放行,接口创建成功(2026 平年 2 月 28 日真实存在)', async () => {
    const parsed = knowledgeUpsertSchema.safeParse({ ...knowledgeBase, categoryId: catId, effectiveFrom: '2026-02-28' });
    expect(parsed.success).toBe(true);

    const res = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...knowledgeBase, categoryId: catId, effectiveFrom: '2026-02-28' });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toEqual(expect.any(Number));
    // 创建的草稿标题带 MARK 前缀,由 afterAll cleanupByMark 统一清理
  });

  it('schema 单测:月/日越界与平闰年全覆盖(knowledge/ai-log/activity 同规则)', () => {
    const okBase = { ...knowledgeBase, categoryId: 1, effectiveFrom: '2026-02-28' };
    expect(knowledgeUpsertSchema.safeParse(okBase).success).toBe(true);
    expect(knowledgeUpsertSchema.safeParse({ ...okBase, effectiveFrom: '2026-13-01' }).success).toBe(false);
    expect(knowledgeUpsertSchema.safeParse({ ...okBase, effectiveFrom: '2026-02-30' }).success).toBe(false);
    expect(knowledgeUpsertSchema.safeParse({ ...okBase, effectiveFrom: '2025-02-29' }).success).toBe(false); // 平年无 2/29
    expect(knowledgeUpsertSchema.safeParse({ ...okBase, effectiveFrom: '2024-02-29' }).success).toBe(true); // 闰年
    expect(knowledgeUpsertSchema.safeParse({ ...okBase, effectiveUntil: '2026-04-31' }).success).toBe(false); // 4 月无 31 日

    expect(aiLogQuerySchema.safeParse({ startDate: '2026-02-30' }).success).toBe(false);
    expect(aiLogQuerySchema.safeParse({ startDate: '2026-02-28' }).success).toBe(true);

    const act = { title: '活动', startTime: '2026-02-28 10:00:00', endTime: '2026-02-28 12:00:00' };
    expect(activityUpsertSchema.safeParse(act).success).toBe(true);
    expect(activityUpsertSchema.safeParse({ ...act, startTime: '2026-13-99 10:00:00' }).success).toBe(false);
    expect(activityUpsertSchema.safeParse({ ...act, endTime: '2026-02-28 25:00:00' }).success).toBe(false); // 小时越界
  });
});
