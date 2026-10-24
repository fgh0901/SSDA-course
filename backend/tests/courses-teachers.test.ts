import request from 'supertest';
import { createApp } from '../src/app';
import { execute } from '../src/config/db';
import { cleanupByMark, insertCourse, insertLocation, insertRelation, insertTeacher, MARK } from './helpers';

const app = createApp();

let courseId: number;
let noRelCourseId: number;
let teacherId: number;
let officeLocId: number;
let classLocId: number;
let relationId: number;

beforeAll(async () => {
  await cleanupByMark();
  officeLocId = await insertLocation({ name: `${MARK}理学楼302`, building: `${MARK}理学楼` });
  classLocId = await insertLocation({ name: `${MARK}第一教室A101`, building: `${MARK}第一教学楼` });
  courseId = await insertCourse({ name: `${MARK}高等数学A上`, code: `${MARK}MATH1` });
  noRelCourseId = await insertCourse({ name: `${MARK}无关系课程`, code: `${MARK}NONE1` });
  teacherId = await insertTeacher({ name: `${MARK}张测试`, title: '副教授' });
  relationId = await insertRelation(courseId, teacherId, classLocId, '周一 3-4 节');
  await execute('UPDATE teacher SET office_location_id = ?, office_hours = ? WHERE id = ?', [
    officeLocId,
    '周三 14:00-16:00',
    teacherId
  ]);
});

afterAll(async () => {
  await cleanupByMark();
});

describe('课程查询(GET /api/courses,契约 2.10/2.11,M06,FR-05)', () => {
  it('列表:含每门课的任教教师简要信息,按 name 升序', async () => {
    const res = await request(app).get(`/api/courses?keyword=${encodeURIComponent(MARK)}`);
    expect(res.status).toBe(200);
    const list = res.body.data.list;
    const math = list.find((c: { code: string }) => c.code === `${MARK}MATH1`);
    expect(math.teachers).toEqual([{ id: teacherId, name: `${MARK}张测试` }]);
    const none = list.find((c: { code: string }) => c.code === `${MARK}NONE1`);
    expect(none.teachers).toEqual([]);
  });

  it('semester 筛选', async () => {
    const res = await request(app).get(`/api/courses?semester=2099-2099-9&keyword=${encodeURIComponent(MARK)}`);
    expect(res.body.data.list).toHaveLength(0);
  });

  it('详情:任教关系含教师/上课时间/上课地点/办公室/答疑时间(契约 2.11 示例结构)', async () => {
    const res = await request(app).get(`/api/courses/${courseId}`);
    expect(res.status).toBe(200);
    const t = res.body.data.teachers[0];
    expect(t.relationId).toBe(relationId);
    expect(t.teacherId).toBe(teacherId);
    expect(t.name).toBe(`${MARK}张测试`);
    expect(t.title).toBe('副教授');
    expect(t.schedule).toBe('周一 3-4 节');
    expect(t.location).toEqual({ id: classLocId, name: `${MARK}第一教室A101` });
    expect(t.office).toEqual({ id: officeLocId, name: `${MARK}理学楼302` });
    expect(t.officeHours).toBe('周三 14:00-16:00');
  });

  it('P03 红线:未录入任教关系的课程返回空数组,不做推断', async () => {
    const res = await request(app).get(`/api/courses/${noRelCourseId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.teachers).toEqual([]);
  });

  it('404 分支:课程不存在', async () => {
    const res = await request(app).get('/api/courses/999999');
    expect(res.status).toBe(404);
  });
});

describe('教师查询(GET /api/teachers,契约 2.12/2.13,M06)', () => {
  it('列表:仅公开字段(姓名/职称/办公室/答疑时间),附任教课程', async () => {
    const res = await request(app).get(`/api/teachers?keyword=${encodeURIComponent('张测试')}`);
    expect(res.status).toBe(200);
    const item = res.body.data.list[0];
    expect(item.name).toBe(`${MARK}张测试`);
    expect(item.office).toEqual({ id: officeLocId, name: `${MARK}理学楼302` });
    expect(item.officeHours).toBe('周三 14:00-16:00');
    expect(item.courses).toEqual([{ id: courseId, name: `${MARK}高等数学A上` }]);
    expect(JSON.stringify(item)).not.toContain('phone');
    expect(JSON.stringify(item)).not.toContain('workNumber');
  });

  it('详情:任教课程含上课时间与地点;未录入关系返回空数组(P03)', async () => {
    const detail = await request(app).get(`/api/teachers/${teacherId}`);
    expect(detail.status).toBe(200);
    const c = detail.body.data.courses[0];
    expect(c.schedule).toBe('周一 3-4 节');
    expect(c.location).toEqual({ id: classLocId, name: `${MARK}第一教室A101` });

    const lonely = await insertTeacher({ name: `${MARK}无课教师` });
    const empty = await request(app).get(`/api/teachers/${lonely}`);
    expect(empty.body.data.courses).toEqual([]);
  });

  it('404 分支:教师不存在', async () => {
    const res = await request(app).get('/api/teachers/999999');
    expect(res.status).toBe(404);
  });
});
