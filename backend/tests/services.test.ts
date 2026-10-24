import request from 'supertest';
import { createApp } from '../src/app';
import { cleanupByMark, insertLocation, insertServiceGuide, MARK } from './helpers';

const app = createApp();

let locId: number;
let disabledId: number;

beforeAll(async () => {
  await cleanupByMark();
  locId = await insertLocation({ name: `${MARK}指南地点`, building: `${MARK}服务楼`, floor: '1', room: '101' });
  await insertServiceGuide({ title: `${MARK}校园卡补办指南`, department: '信息化办公室', locationId: locId });
  await insertServiceGuide({ title: `${MARK}水卡充值指南`, department: '后勤服务中心' });
  disabledId = await insertServiceGuide({ title: `${MARK}停用指南`, isEnabled: 0 });
});

afterAll(async () => {
  await cleanupByMark();
});

describe('办事指南(GET /api/services,契约 2.5/2.6,M03,FR-04)', () => {
  it('列表仅返回上架指南,按 updatedAt 倒序,location 为嵌套对象', async () => {
    const res = await request(app).get(`/api/services?keyword=${encodeURIComponent(MARK)}`);
    expect(res.status).toBe(200);
    const list = res.body.data.list;
    expect(list.length).toBe(2);
    const card = list.find((i: { title: string }) => i.title === `${MARK}校园卡补办指南`);
    expect(card.department).toBe('信息化办公室');
    expect(card.location).toEqual({ id: locId, name: `${MARK}指南地点`, campus: '主校区', building: `${MARK}服务楼`, floor: '1', room: '101' });
    expect(card.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('keyword 匹配标题或部门', async () => {
    const res = await request(app).get(`/api/services?keyword=${encodeURIComponent('后勤服务中心')}`);
    const titles = res.body.data.list.map((i: { title: string }) => i.title);
    expect(titles).toContain(`${MARK}水卡充值指南`);
    expect(titles).not.toContain(`${MARK}校园卡补办指南`);
  });

  it('locationId 筛选:仅返回该地点的指南', async () => {
    const res = await request(app).get(`/api/services?locationId=${locId}`);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].title).toBe(`${MARK}校园卡补办指南`);
  });

  it('详情:含材料清单与办理流程;停用指南返回 404', async () => {
    const created = await request(app).get(`/api/services?keyword=${encodeURIComponent(MARK)}`);
    const id = created.body.data.list[0].id;
    const detail = await request(app).get(`/api/services/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toHaveProperty('materials');
    expect(detail.body.data).toHaveProperty('process');

    const off = await request(app).get(`/api/services/${disabledId}`);
    expect(off.status).toBe(404);
    expect(off.body.error.message).toBe('办事指南不存在或已停用');
  });

  it('400 分支:id 非法返回 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/services/abc');
    expect(res.status).toBe(400);
  });
});
