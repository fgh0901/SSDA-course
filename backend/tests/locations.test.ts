import request from 'supertest';
import { createApp } from '../src/app';
import { cleanupByMark, insertLocation, MARK } from './helpers';

const app = createApp();

beforeAll(async () => {
  await cleanupByMark();
  await insertLocation({ name: `${MARK}东区田径场`, campus: '主校区', building: `${MARK}运动区` });
  await insertLocation({ name: `${MARK}理学楼302`, campus: '主校区', building: `${MARK}理学楼`, floor: '3' });
  await insertLocation({ name: `${MARK}南区分馆`, campus: '南校区', building: `${MARK}图书馆` });
});

afterAll(async () => {
  await cleanupByMark();
});

describe('地点查询(GET /api/locations,契约 2.9,M05,FR-05)', () => {
  it('keyword 匹配名称', async () => {
    const res = await request(app).get(`/api/locations?keyword=${encodeURIComponent('田径场')}`);
    const list = res.body.data.list.filter((l: { name: string }) => l.name.startsWith(MARK));
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe(`${MARK}东区田径场`);
  });

  it('campus 精确筛选:只含该校区,按 campus,name 排序', async () => {
    const res = await request(app).get(`/api/locations?campus=${encodeURIComponent('主校区')}&pageSize=100`);
    const ours = res.body.data.list.filter((l: { name: string }) => l.name.startsWith(MARK));
    expect(ours.map((l: { name: string }) => l.name)).toEqual([`${MARK}东区田径场`, `${MARK}理学楼302`]);
  });

  it('building 精确筛选', async () => {
    const res = await request(app).get(`/api/locations?building=${encodeURIComponent(`${MARK}理学楼`)}`);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].floor).toBe('3');
  });

  it('TC-03 不存在的名称:返回空列表', async () => {
    const res = await request(app).get(`/api/locations?keyword=${encodeURIComponent('不存在楼栋ZZZ')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(0);
  });
});
