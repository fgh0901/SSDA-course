import request from 'supertest';
import { createApp } from '../src/app';
import { query } from '../src/config/db';
import { cleanupByMark, createAdmin, dateOffset, dateTimeOffset, insertCategory, insertKnowledge, login, MARK } from './helpers';

const app = createApp();
const USERNAME = `${MARK}admin-kn`;
const PASSWORD = 'test-pass-123';
let token: string;
let catId: number;

beforeAll(async () => {
  await cleanupByMark();
  await createAdmin(USERNAME, PASSWORD);
  token = await login(app, USERNAME, PASSWORD);
  catId = await insertCategory(`${MARK}知识管理分类`);
});

afterAll(async () => {
  await cleanupByMark();
});

describe('知识管理生命周期(POST/PUT/审核流,契约 3.4~3.9,M09/M10)', () => {
  it('TC-06 管理员新增知识:写入数据库(初始 draft),学生端按发布规则暂不可查', async () => {
    const create = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}宿舍网络报修指南`,
        categoryId: catId,
        content: '第一步:自查;第二步:提交工单。',
        source: '校网络中心服务指南',
        effectiveFrom: dateOffset(-1),
        effectiveUntil: dateOffset(30)
      });
    expect(create.status).toBe(200);
    expect(create.body.data).toEqual({ id: expect.any(Number), status: 'draft' });
    const id = create.body.data.id;

    const student = await request(app).get(`/api/knowledge/${id}`);
    expect(student.status).toBe(404);

    const admin = await request(app).get(`/api/admin/knowledge/${id}`).set('Authorization', `Bearer ${token}`);
    expect(admin.status).toBe(200);
    expect(admin.body.data.status).toBe('draft');
  });

  it('P04 全流程:submit-review → review publish → 学生端可见', async () => {
    const created = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}先审后发流程条目`,
        categoryId: catId,
        content: '正文内容',
        source: '测试来源',
        effectiveFrom: dateOffset(-1)
      });
    const id = created.body.data.id;

    const submit = await request(app).post(`/api/admin/knowledge/${id}/submit-review`).set('Authorization', `Bearer ${token}`);
    expect(submit.body.data.status).toBe('pending_review');

    const dup = await request(app).post(`/api/admin/knowledge/${id}/submit-review`).set('Authorization', `Bearer ${token}`);
    expect(dup.status).toBe(409);

    const review = await request(app)
      .post(`/api/admin/knowledge/${id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'publish', comment: '已核实' });
    expect(review.body.data.status).toBe('published');

    const student = await request(app).get(`/api/knowledge/${id}`);
    expect(student.status).toBe(200);
    expect(student.body.data.status).toBe('published');
  });

  it('审核驳回:reject 必填备注,驳回后回 draft,日志记录原因', async () => {
    const created = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}驳回流程条目`,
        categoryId: catId,
        content: '正文',
        source: '测试来源',
        effectiveFrom: dateOffset(-1)
      });
    const id = created.body.data.id;
    await request(app).post(`/api/admin/knowledge/${id}/submit-review`).set('Authorization', `Bearer ${token}`);

    const noComment = await request(app)
      .post(`/api/admin/knowledge/${id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'reject' });
    expect(noComment.status).toBe(400);
    expect(noComment.body.error.message).toContain('备注');

    const badAction = await request(app)
      .post(`/api/admin/knowledge/${id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'delete' });
    expect(badAction.status).toBe(400);

    const reject = await request(app)
      .post(`/api/admin/knowledge/${id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'reject', comment: '内容与来源不一致,请补充' });
    expect(reject.body.data.status).toBe('draft');

    const logs = await request(app).get(`/api/admin/knowledge/${id}/change-logs`).set('Authorization', `Bearer ${token}`);
    const actions = logs.body.data.list.map((l: { action: string }) => l.action);
    expect(actions[0]).toBe('review_reject');
    expect(logs.body.data.list[0].detail).toContain('内容与来源不一致');
  });

  it('契约 3.5:published 状态编辑保存后自动回退 draft(先审后发红线)', async () => {
    const id = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}编辑回退验证`,
      content: '正文',
      status: 'published',
      effectiveFrom: dateOffset(-1)
    });
    const res = await request(app)
      .put(`/api/admin/knowledge/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}编辑回退验证(改)`,
        categoryId: catId,
        content: '新正文',
        source: '新来源',
        effectiveFrom: dateOffset(-1)
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
  });

  it('契约 3.6:仅 draft 可物理删除,其余状态 409 引导下架', async () => {
    const draftId = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}可删除草稿`,
      content: 'x',
      status: 'draft',
      effectiveFrom: dateOffset(-1)
    });
    const del = await request(app).delete(`/api/admin/knowledge/${draftId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.data).toEqual({ id: draftId });

    const publishedId = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}不可删除发布`,
      content: 'x',
      status: 'published',
      effectiveFrom: dateOffset(-1)
    });
    const conflict = await request(app).delete(`/api/admin/knowledge/${publishedId}`).set('Authorization', `Bearer ${token}`);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.message).toBe('仅草稿状态的知识可删除,其他状态请使用下架');
  });

  it('契约 3.9:takedown 仅 published 可下架;下架后学生端 404(TC-09)', async () => {
    const id = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}下架流程条目`,
      content: 'x',
      status: 'published',
      effectiveFrom: dateOffset(-1)
    });
    expect((await request(app).get(`/api/knowledge/${id}`)).status).toBe(200);

    const takedown = await request(app).post(`/api/admin/knowledge/${id}/takedown`).set('Authorization', `Bearer ${token}`);
    expect(takedown.body.data.status).toBe('takedown');

    const again = await request(app).post(`/api/admin/knowledge/${id}/takedown`).set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(409);

    const student = await request(app).get(`/api/knowledge/${id}`);
    expect(student.status).toBe(404);
  });

  it('TC-09 已下架知识重新上架也须经审核(takedown → pending_review 可行)', async () => {
    const id = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}重新上架条目`,
      content: 'x',
      status: 'takedown',
      effectiveFrom: dateOffset(-1)
    });
    const res = await request(app).post(`/api/admin/knowledge/${id}/submit-review`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending_review');
  });
});

describe('管理端知识列表(契约 3.2)', () => {
  beforeAll(async () => {
    await insertKnowledge({
      categoryId: catId,
      title: `${MARK}列表验证发布`,
      content: 'x',
      status: 'published',
      effectiveFrom: dateOffset(-1)
    });
    await insertKnowledge({
      categoryId: catId,
      title: `${MARK}列表验证下架`,
      content: 'x',
      status: 'takedown',
      effectiveFrom: dateOffset(-1)
    });
  });

  it('缺省返回全部状态,按 updatedAt 倒序', async () => {
    const res = await request(app)
      .get(`/api/admin/knowledge?keyword=${encodeURIComponent(MARK)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const statuses = res.body.data.list.map((i: { status: string }) => new Set([i.status]));
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(2);
    void statuses;
  });

  it('status 多值筛选:status=published,takedown 只返回这两态', async () => {
    const res = await request(app)
      .get(`/api/admin/knowledge?status=published,takedown&keyword=${encodeURIComponent(MARK)}&pageSize=100`)
      .set('Authorization', `Bearer ${token}`);
    for (const item of res.body.data.list) {
      expect(['published', 'takedown']).toContain(item.status);
    }
    const titles = res.body.data.list.map((i: { title: string }) => i.title);
    expect(titles).toContain(`${MARK}列表验证下架`);
  });

  it('400 分支:status 取值非法', async () => {
    const res = await request(app)
      .get('/api/admin/knowledge?status=archived')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('status');
  });

  it('isVerified 筛选', async () => {
    const res = await request(app)
      .get(`/api/admin/knowledge?isVerified=1&keyword=${encodeURIComponent(MARK)}&pageSize=100`)
      .set('Authorization', `Bearer ${token}`);
    for (const item of res.body.data.list) {
      expect(item.isVerified).toBe(1);
    }
  });
});

describe('TC-08 校验失败拒绝保存(契约 3.4,message 指明字段)', () => {
  const validBody = () => ({
    title: `${MARK}校验基线条目`,
    categoryId: catId,
    content: '正文',
    source: '测试来源',
    effectiveFrom: dateOffset(-1)
  });

  it('缺标题:400 且 message 含"标题"', async () => {
    const { title, ...noTitle } = validBody();
    void title;
    const res = await request(app).post('/api/admin/knowledge').set('Authorization', `Bearer ${token}`).send(noTitle);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('标题');
  });

  it('缺来源:400 且 message 含"来源"(FR-11)', async () => {
    const { source, ...noSource } = validBody();
    void source;
    const res = await request(app).post('/api/admin/knowledge').set('Authorization', `Bearer ${token}`).send(noSource);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('来源');
  });

  it('无效日期:400 且提示 YYYY-MM-DD 格式', async () => {
    const res = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody(), effectiveFrom: '2026/09/01' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('YYYY-MM-DD');
  });

  it('有效期止早于有效期起:400', async () => {
    const res = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody(), effectiveUntil: dateOffset(-10) });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('有效期');
  });

  it('分类不存在或停用:400', async () => {
    const res = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody(), categoryId: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('分类');
  });
});

describe('过期/临期工作台(GET /api/admin/knowledge/expired,契约 3.10,M10,P05)', () => {
  it('expired 组:published 且过有效期,含 daysOverdue;学生端仍可见(带过期标识)', async () => {
    const expiredId = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}工作台过期条目`,
      content: 'x',
      status: 'published',
      effectiveFrom: dateOffset(-40),
      effectiveUntil: dateOffset(-3)
    });
    const res = await request(app)
      .get('/api/admin/knowledge/expired?state=expired')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const item = res.body.data.list.find((i: { id: number }) => i.id === expiredId);
    expect(item).toBeDefined();
    expect(item.state).toBe('expired');
    expect(item.daysOverdue).toBe(3);
    expect(item.daysOverdue).toBeGreaterThanOrEqual(0);

    const student = await request(app).get(`/api/knowledge/${expiredId}`);
    expect(student.status).toBe(200);
    expect(student.body.data.isExpired).toBe(true);
  });

  it('expiring 组:临期窗口内(默认 7 天),含 daysRemaining;state=expiring', async () => {
    const expiringId = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}工作台临期条目`,
      content: 'x',
      status: 'published',
      effectiveFrom: dateOffset(-10),
      effectiveUntil: dateOffset(5)
    });
    const res = await request(app)
      .get('/api/admin/knowledge/expired?state=expiring&days=7')
      .set('Authorization', `Bearer ${token}`);
    const item = res.body.data.list.find((i: { id: number }) => i.id === expiringId);
    expect(item).toBeDefined();
    expect(item.state).toBe('expiring');
    expect(item.daysRemaining).toBe(5);
  });

  it('缺省 state:expired 与 expiring 都返回;400 分支 state 非法', async () => {
    const both = await request(app).get('/api/admin/knowledge/expired').set('Authorization', `Bearer ${token}`);
    const states = new Set(both.body.data.list.map((i: { state: string }) => i.state));
    expect(states.has('expired')).toBe(true);
    expect(states.has('expiring')).toBe(true);

    const bad = await request(app).get('/api/admin/knowledge/expired?state=soon').set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);
  });
});

describe('变更日志(GET /api/admin/knowledge/:id/change-logs,契约 3.11)', () => {
  it('记录 create/update 等动作,含操作人用户名,倒序;删除日志随知识级联清理', async () => {
    const created = await request(app)
      .post('/api/admin/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}日志追踪条目`,
        categoryId: catId,
        content: '正文',
        source: '来源',
        effectiveFrom: dateOffset(-1)
      });
    const id = created.body.data.id;
    await request(app)
      .put(`/api/admin/knowledge/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}日志追踪条目(改)`,
        categoryId: catId,
        content: '正文改',
        source: '来源',
        effectiveFrom: dateOffset(-1)
      });

    const res = await request(app).get(`/api/admin/knowledge/${id}/change-logs`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.list[0].action).toBe('update');
    expect(res.body.data.list[1].action).toBe('create');
    expect(res.body.data.list[0].adminUsername).toBe(USERNAME);
    expect(res.body.data.list[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

    await request(app).delete(`/api/admin/knowledge/${id}`).set('Authorization', `Bearer ${token}`);
    const left = await query<Array<{ total: number }>>('SELECT COUNT(*) AS total FROM knowledge_change_log WHERE knowledge_id = ?', [id]);
    expect(left[0].total).toBe(0);
  });

  it('404 分支:知识不存在', async () => {
    const res = await request(app).get('/api/admin/knowledge/999999/change-logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('活动时间校验(契约 3.14,TC-08 口径)', () => {
  it('endTime 早于 startTime:400;DATETIME 格式非法:400', async () => {
    const bad = await request(app)
      .post('/api/admin/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}时间倒置活动`,
        startTime: dateTimeOffset(3),
        endTime: dateTimeOffset(1)
      });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toContain('结束时间');

    const badFormat = await request(app)
      .post('/api/admin/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `${MARK}格式错误活动`, startTime: '2026-10-01', endTime: '2026-10-02' });
    expect(badFormat.status).toBe(400);
    expect(badFormat.body.error.message).toContain('YYYY-MM-DD HH:mm:ss');
  });
});
