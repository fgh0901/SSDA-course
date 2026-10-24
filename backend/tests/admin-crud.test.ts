import request from 'supertest';
import { createApp } from '../src/app';
import {
  cleanupByMark,
  createAdmin,
  dateTimeOffset,
  insertCourse,
  insertKnowledge,
  insertLocation,
  insertRelation,
  insertServiceGuide,
  insertTeacher,
  login,
  MARK
} from './helpers';

const app = createApp();
const USERNAME = `${MARK}admin-crud`;
const PASSWORD = 'test-pass-123';
let token: string;

beforeAll(async () => {
  await cleanupByMark();
  await createAdmin(USERNAME, PASSWORD);
  token = await login(app, USERNAME, PASSWORD);
});

afterAll(async () => {
  await cleanupByMark();
});

describe('分类管理(契约 3.12,FR-09)', () => {
  it('新增/重名 400/更新/删除;删除有关联知识时 409 并提示条数', async () => {
    const create = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}分类A`, description: '测试', sortOrder: 9 });
    expect(create.status).toBe(200);
    const catId = create.body.data.id;

    const dup = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}分类A` });
    expect(dup.status).toBe(400);
    expect(dup.body.error.message).toBe('分类名称已存在');

    const update = await request(app)
      .put(`/api/admin/categories/${catId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}分类A改`, description: '测试改', sortOrder: 1, isEnabled: 1 });
    expect(update.status).toBe(200);

    const adminList = await request(app).get('/api/admin/categories').set('Authorization', `Bearer ${token}`);
    const row = adminList.body.data.list.find((c: { id: number }) => c.id === catId);
    expect(row).toBeDefined();
    expect(row).toHaveProperty('knowledgeCount');

    const knowledgeId = await insertKnowledge({
      categoryId: catId,
      title: `${MARK}分类冲突知识`,
      content: 'x',
      status: 'draft',
      effectiveFrom: '2026-01-01'
    });
    void knowledgeId;
    const conflict = await request(app).delete(`/api/admin/categories/${catId}`).set('Authorization', `Bearer ${token}`);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.message).toContain('请先迁移或删除');

    // 迁移后(直接删除该知识)可删除分类
    await request(app).delete(`/api/admin/knowledge/${knowledgeId}`).set('Authorization', `Bearer ${token}`);
    const del = await request(app).delete(`/api/admin/categories/${catId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  it('404 分支:更新/删除不存在的分类', async () => {
    const res = await request(app)
      .put('/api/admin/categories/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}不存在分类` });
    expect(res.status).toBe(404);
    const del = await request(app).delete('/api/admin/categories/999999').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(404);
  });
});

describe('办事指南管理(契约 3.13)', () => {
  it('CRUD 全流程:locationId 校验、含停用项、直接删除', async () => {
    const locId = await insertLocation({ name: `${MARK}指南管理地点` });
    const create = await request(app)
      .post('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}指南管理条目`,
        department: '测试部门',
        locationId: locId,
        serviceTime: '工作日 9:00-17:00',
        materials: '身份证',
        process: '取号→办理'
      });
    expect(create.status).toBe(200);
    const id = create.body.data.id;

    const badLoc = await request(app)
      .post('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `${MARK}坏地点指南`, department: 'x', locationId: 999999 });
    expect(badLoc.status).toBe(400);

    const update = await request(app)
      .put(`/api/admin/services/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `${MARK}指南管理条目改`, department: '测试部门', isEnabled: 0 });
    expect(update.status).toBe(200);

    const adminList = await request(app)
      .get(`/api/admin/services?keyword=${encodeURIComponent(MARK)}`)
      .set('Authorization', `Bearer ${token}`);
    const row = adminList.body.data.list.find((i: { id: number }) => i.id === id);
    expect(row.isEnabled).toBe(0);

    const student = await request(app).get(`/api/services/${id}`);
    expect(student.status).toBe(404);

    const del = await request(app).delete(`/api/admin/services/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const missing = await request(app).get('/api/admin/services/999999').set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
  });

  it('400 分支:缺必填字段(department)', async () => {
    const res = await request(app)
      .post('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `${MARK}缺部门指南` });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('部门');
  });
});

describe('活动管理(契约 3.14)', () => {
  it('CRUD 全流程', async () => {
    const create = await request(app)
      .post('/api/admin/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}活动管理条目`,
        startTime: dateTimeOffset(2),
        endTime: dateTimeOffset(2, 12),
        signupMethod: '现场报名',
        targetAudience: '全体学生'
      });
    expect(create.status).toBe(200);
    const id = create.body.data.id;

    const update = await request(app)
      .put(`/api/admin/activities/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `${MARK}活动管理条目改`,
        startTime: dateTimeOffset(2),
        endTime: dateTimeOffset(2, 12),
        isEnabled: 0
      });
    expect(update.status).toBe(200);

    const adminList = await request(app)
      .get(`/api/admin/activities?keyword=${encodeURIComponent(MARK)}`)
      .set('Authorization', `Bearer ${token}`);
    const row = adminList.body.data.list.find((i: { id: number }) => i.id === id);
    expect(row.isEnabled).toBe(0);

    const del = await request(app).delete(`/api/admin/activities/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });
});

describe('地点管理(契约 3.15)', () => {
  it('CRUD;被引用删除 409 且 message 含引用数量', async () => {
    const create = await request(app)
      .post('/api/admin/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}地点管理条目`, campus: '主校区', building: '测试楼' });
    expect(create.status).toBe(200);
    const id = create.body.data.id;

    await insertServiceGuide({ title: `${MARK}引用地点的指南`, locationId: id });
    const conflict = await request(app).delete(`/api/admin/locations/${id}`).set('Authorization', `Bearer ${token}`);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.message).toContain('1');

    const update = await request(app)
      .put(`/api/admin/locations/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}地点管理条目改`, campus: '主校区' });
    expect(update.status).toBe(200);

    // 解除引用后可删除
    const guides = await request(app)
      .get(`/api/admin/services?keyword=${encodeURIComponent(MARK)}`)
      .set('Authorization', `Bearer ${token}`);
    const guideId = guides.body.data.list.find((i: { title: string }) => i.title === `${MARK}引用地点的指南`).id;
    await request(app).delete(`/api/admin/services/${guideId}`).set('Authorization', `Bearer ${token}`);
    const del = await request(app).delete(`/api/admin/locations/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  it('400 分支:缺 campus', async () => {
    const res = await request(app)
      .post('/api/admin/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}缺校区地点` });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('校区');
  });
});

describe('课程与教师管理(契约 3.16/3.17)', () => {
  it('课程 CRUD;课程代码重名 400;有任教关系删除 409', async () => {
    const create = await request(app)
      .post('/api/admin/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}课程管理条目`, code: `${MARK}CO1`, semester: '2026-2027-1' });
    expect(create.status).toBe(200);
    const id = create.body.data.id;

    const dup = await request(app)
      .post('/api/admin/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}另一门课`, code: `${MARK}CO1` });
    expect(dup.status).toBe(400);
    expect(dup.body.error.message).toBe('课程代码已存在');

    const teacherId = await insertTeacher({ name: `${MARK}课程冲突教师` });
    await insertRelation(id, teacherId);
    const conflict = await request(app).delete(`/api/admin/courses/${id}`).set('Authorization', `Bearer ${token}`);
    expect(conflict.status).toBe(409);

    const update = await request(app)
      .put(`/api/admin/courses/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}课程管理条目改`, code: `${MARK}CO1` });
    expect(update.status).toBe(200);

    const missing = await request(app).put('/api/admin/courses/999999').set('Authorization', `Bearer ${token}`).send({
      name: 'x',
      code: 'x'
    });
    expect(missing.status).toBe(404);
  });

  it('教师 CRUD;strict 拒绝电话/工号等隐私字段(400);有任教关系删除 409', async () => {
    const withPhone = await request(app)
      .post('/api/admin/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}带电话教师`, phone: '13800000000' });
    expect(withPhone.status).toBe(400);
    expect(withPhone.body.error.message).toContain('不允许提交的字段');

    const withWorkNo = await request(app)
      .post('/api/admin/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}带工号教师`, workNumber: 'T0001' });
    expect(withWorkNo.status).toBe(400);

    const create = await request(app)
      .post('/api/admin/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}教师管理条目`, title: '讲师', officeHours: '周一 14:00-16:00' });
    expect(create.status).toBe(200);
    const id = create.body.data.id;

    const update = await request(app)
      .put(`/api/admin/teachers/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${MARK}教师管理条目改`, title: '副教授' });
    expect(update.status).toBe(200);

    const teacher2 = await insertTeacher({ name: `${MARK}有课教师` });
    const courseId = await insertCourse({ name: `${MARK}教师冲突课程`, code: `${MARK}CO2` });
    await insertRelation(courseId, teacher2);
    const conflict = await request(app).delete(`/api/admin/teachers/${teacher2}`).set('Authorization', `Bearer ${token}`);
    expect(conflict.status).toBe(409);

    const del = await request(app).delete(`/api/admin/teachers/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });
});

describe('任教关系管理(契约 3.18,FR-05)', () => {
  it('添加/重复 409/列表/按关系主键删除', async () => {
    const courseId = await insertCourse({ name: `${MARK}关系课程A`, code: `${MARK}RE1` });
    const teacherId = await insertTeacher({ name: `${MARK}关系教师A` });
    const locId = await insertLocation({ name: `${MARK}关系教室` });

    const add = await request(app)
      .post(`/api/admin/courses/${courseId}/teachers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ teacherId, locationId: locId, schedule: '周二 1-2 节' });
    expect(add.status).toBe(200);
    const relationId = add.body.data.id;

    const dup = await request(app)
      .post(`/api/admin/courses/${courseId}/teachers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ teacherId });
    expect(dup.status).toBe(409);
    expect(dup.body.error.message).toBe('该教师已关联此课程');

    const badTeacher = await request(app)
      .post(`/api/admin/courses/${courseId}/teachers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ teacherId: 999999 });
    expect(badTeacher.status).toBe(400);

    const list = await request(app).get(`/api/admin/courses/${courseId}/teachers`).set('Authorization', `Bearer ${token}`);
    expect(list.body.data.list).toHaveLength(1);
    expect(list.body.data.list[0].name).toBe(`${MARK}关系教师A`);

    const remove = await request(app)
      .delete(`/api/admin/courses/${courseId}/teachers/${relationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);
    expect(remove.body.data).toEqual({ id: relationId });

    const wrongCourse = await request(app)
      .delete(`/api/admin/courses/${courseId}/teachers/${relationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(wrongCourse.status).toBe(404);

    const empty = await request(app).get(`/api/admin/courses/${courseId}/teachers`).set('Authorization', `Bearer ${token}`);
    expect(empty.body.data.list).toEqual([]);
  });
});

describe('TC-08 管理端批量校验口径', () => {
  it('分类缺名称:400 指明字段', async () => {
    const res = await request(app).post('/api/admin/categories').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('分类名称');
  });

  it('活动缺标题:400 指明字段', async () => {
    const res = await request(app)
      .post('/api/admin/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({ startTime: dateTimeOffset(1), endTime: dateTimeOffset(1, 12) });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('标题');
  });
});
