import request from 'supertest';
import { createApp } from '../src/app';
import { cleanupByMark, dateTimeOffset, insertActivity, insertLocation, MARK } from './helpers';

const app = createApp();

let locId: number;
let upcomingId: number;
let pastId: number;

beforeAll(async () => {
  await cleanupByMark();
  locId = await insertLocation({ name: `${MARK}活动地点` });
  upcomingId = await insertActivity({
    title: `${MARK}未开始的校园跑`,
    startTime: dateTimeOffset(3, 16),
    endTime: dateTimeOffset(3, 18),
    locationId: locId
  });
  pastId = await insertActivity({
    title: `${MARK}已结束的迎新晚会`,
    startTime: dateTimeOffset(-10, 19),
    endTime: dateTimeOffset(-10, 21),
    locationId: locId
  });
  await insertActivity({ title: `${MARK}已下架活动`, startTime: dateTimeOffset(1), endTime: dateTimeOffset(1, 12), isEnabled: 0 });
});

afterAll(async () => {
  await cleanupByMark();
});

describe('校园活动(GET /api/activities,契约 2.7/2.8,M04,FR-06)', () => {
  it('列表仅返回上架活动,按 startTime 倒序,location 为嵌套对象', async () => {
    const res = await request(app).get(`/api/activities?keyword=${encodeURIComponent(MARK)}`);
    expect(res.status).toBe(200);
    const list = res.body.data.list;
    expect(list.length).toBe(2);
    expect(list[0].id).toBe(upcomingId);
    expect(list[0].location).toEqual({ id: locId, name: `${MARK}活动地点` });
    expect(list[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('time=upcoming 只返回未开始活动;time=past 只返回已结束活动', async () => {
    const up = await request(app).get(`/api/activities?time=upcoming&keyword=${encodeURIComponent(MARK)}`);
    expect(up.body.data.list.map((i: { id: number }) => i.id)).toEqual([upcomingId]);
    const past = await request(app).get(`/api/activities?time=past&keyword=${encodeURIComponent(MARK)}`);
    expect(past.body.data.list.map((i: { id: number }) => i.id)).toEqual([pastId]);
  });

  it('400 分支:time 取值非法返回 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/activities?time=tomorrow');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('time');
  });

  it('详情:含 description;不存在的活动 404', async () => {
    const detail = await request(app).get(`/api/activities/${upcomingId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toHaveProperty('description');

    const missing = await request(app).get(`/api/activities/${pastId + 1000000}`);
    expect(missing.status).toBe(404);
  });
});
