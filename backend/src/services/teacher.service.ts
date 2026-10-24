import * as teacherDao from '../dao/teacher.dao';
import * as locationDao from '../dao/location.dao';
import { HttpError } from '../utils/http';
import type { TeacherUpsert } from '../validators/course.schema';

/** 教师列表(契约 2.12,仅公开字段,按 name 升序) */
export async function listPublic(q: { keyword?: string; page: number; pageSize: number }) {
  const { rows, total } = await teacherDao.list(q);
  const briefs = await teacherDao.courseBriefByTeacherIds(rows.map((r) => r.id));
  const list = rows.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    title: teacher.title,
    office: teacher.officeLocationId !== null && teacher.officeName !== null
      ? { id: teacher.officeLocationId, name: teacher.officeName }
      : null,
    officeHours: teacher.officeHours,
    courses: briefs.filter((b) => b.teacherId === teacher.id).map((b) => ({ id: b.id, name: b.name }))
  }));
  return { list, total, page: q.page, pageSize: q.pageSize };
}

/** 教师详情(契约 2.13;未录入任教关系返回空数组,不做推断 P03) */
export async function detailPublic(id: number) {
  const teacher = await teacherDao.findById(id);
  if (!teacher) throw new HttpError(404, 'NOT_FOUND', '教师不存在');
  const courses = await teacherDao.courseDetailByTeacherId(id);
  return {
    id: teacher.id,
    name: teacher.name,
    title: teacher.title,
    office: teacher.officeLocationId !== null && teacher.officeName !== null
      ? { id: teacher.officeLocationId, name: teacher.officeName }
      : null,
    officeHours: teacher.officeHours,
    courses: courses.map((c) => ({
      relationId: c.relationId,
      courseId: c.courseId,
      id: c.courseId,
      name: c.courseName,
      code: c.code,
      schedule: c.schedule,
      location: c.locationId !== null && c.locationName !== null ? { id: c.locationId, name: c.locationName } : null
    }))
  };
}

export async function listAdmin(q: { keyword?: string; page: number; pageSize: number }) {
  return listPublic(q);
}

export async function detailAdmin(id: number) {
  return detailPublic(id);
}

async function assertOfficeExists(locationId: number | undefined): Promise<void> {
  if (locationId === undefined) return;
  const loc = await locationDao.findById(locationId);
  if (!loc) throw new HttpError(400, 'VALIDATION_ERROR', 'officeLocationId 对应的地点不存在');
}

export async function create(input: TeacherUpsert): Promise<{ id: number }> {
  await assertOfficeExists(input.officeLocationId);
  const id = await teacherDao.insertTeacher({
    name: input.name,
    title: input.title ?? null,
    officeLocationId: input.officeLocationId ?? null,
    officeHours: input.officeHours ?? null
  });
  return { id };
}

export async function update(id: number, input: TeacherUpsert): Promise<void> {
  const teacher = await teacherDao.findById(id);
  if (!teacher) throw new HttpError(404, 'NOT_FOUND', '教师不存在');
  await assertOfficeExists(input.officeLocationId);
  await teacherDao.updateTeacher(id, {
    name: input.name,
    title: input.title ?? null,
    officeLocationId: input.officeLocationId ?? null,
    officeHours: input.officeHours ?? null
  });
}

/** 删除保护:存在任教关系 → 409(契约 3.17) */
export async function remove(id: number): Promise<{ id: number }> {
  const teacher = await teacherDao.findById(id);
  if (!teacher) throw new HttpError(404, 'NOT_FOUND', '教师不存在');
  const count = await teacherDao.countRelations(id);
  if (count > 0) {
    throw new HttpError(409, 'CONFLICT', `该教师仍有 ${count} 条任教关系,请先删除任教关系`);
  }
  await teacherDao.removeTeacher(id);
  return { id };
}
