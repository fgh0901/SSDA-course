import request from 'supertest';
import { createApp } from '../src/app';
import {
  cleanupByMark,
  dateTimeOffset,
  insertActivity,
  insertCategory,
  insertCourse,
  insertKnowledge,
  insertLocation,
  insertServiceGuide,
  insertTeacher,
  MARK
} from './helpers';

const app = createApp();

beforeAll(async () => {
  await cleanupByMark();
  const catId = await insertCategory(`${MARK}聚合搜索分类`);
  const locId = await insertLocation({ name: `${MARK}聚合地点楼` });
  await insertKnowledge({
    categoryId: catId,
    title: `${MARK}聚合搜索知识条目`,
    content: '聚合搜索测试正文',
    status: 'published',
    effectiveFrom: '2026-01-01'
  });
  await insertServiceGuide({ title: `${MARK}聚合搜索指南`, locationId: locId });
  await insertActivity({
    title: `${MARK}聚合搜索活动`,
    startTime: dateTimeOffset(3),
    endTime: dateTimeOffset(3, 12),
    locationId: locId
  });
  await insertCourse({ name: `${MARK}聚合搜索课程`, code: `${MARK}C1` });
  await insertTeacher({ name: `${MARK}聚合教师甲` });
});

afterAll(async () => {
  await cleanupByMark();
});

describe('聚合搜索(GET /api/search,契约 2.14,M07)', () => {
  it('TC-01 有效关键词:返回按类型分组的命中结果', async () => {
    const res = await request(app).get(`/api/search?keyword=${encodeURIComponent(MARK)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.keyword).toBe(MARK);
    const groups = res.body.data.groups;
    const types = groups.map((g: { type: string }) => g.type).sort();
    expect(types).toEqual(['activity', 'course', 'knowledge', 'location', 'service', 'teacher']);
    const knowledge = groups.find((g: { type: string }) => g.type === 'knowledge');
    expect(knowledge.items.some((i: { title: string }) => i.title === `${MARK}聚合搜索知识条目`)).toBe(true);
    expect(knowledge.items[0]).toHaveProperty('updatedAt');
  });

  it('TC-01 type 筛选:仅返回所选类型分组', async () => {
    const res = await request(app).get(`/api/search?keyword=${encodeURIComponent(MARK)}&type=service,location`);
    const types = res.body.data.groups.map((g: { type: string }) => g.type).sort();
    expect(types).toEqual(['location', 'service']);
  });

  it('TC-02 空关键词:返回 400 并提示输入关键词(服务端校验兜底)', async () => {
    const res = await request(app).get(`/api/search?keyword=${encodeURIComponent('   ')}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('keyword');
  });

  it('keyword 缺失:返回 400', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
  });

  it('TC-03 不存在的关键词:groups 为空数组(前端统一展示无结果)', async () => {
    const res = await request(app).get(`/api/search?keyword=${encodeURIComponent('绝不存在的组合词QQXX')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.groups).toEqual([]);
  });

  it('400 分支:type 取值非法返回 VALIDATION_ERROR', async () => {
    const res = await request(app).get(`/api/search?keyword=${encodeURIComponent(MARK)}&type=knowledge,video`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('type');
  });

  it('400 分支:keyword 超过 50 字符返回 400', async () => {
    const res = await request(app).get(`/api/search?keyword=${'长'.repeat(51)}`);
    expect(res.status).toBe(400);
  });
});
