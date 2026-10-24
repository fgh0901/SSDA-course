import * as courseDao from '../dao/course.dao';
import type { CourseTeacherRow } from '../dao/course.dao';
import * as teacherDao from '../dao/teacher.dao';
import * as locationDao from '../dao/location.dao';
import { HttpError } from '../utils/http';
import type { CourseQuery, CourseUpsert, CourseTeacherUpsert } from '../validators/course.schema';

function toTeacherItem(row: CourseTeacherRow) {
  return {
    relationId: row.relationId,
    teacherId: row.teacherId,
    name: row.teacherName,
    title: row.teacherTitle,
    schedule: row.schedule,
    location: row.locationId !== null && row.locationName !== null ? { id: row.locationId, name: row.locationName } : null,
    office: row.officeLocationId !== null && row.officeName !== null ? { id: row.officeLocationId, name: row.officeName } : null,
    officeHours: row.officeHours
  };
}

/** 课程列表(契约 2.10,附任教教师简要信息,按 name 升序) */
export async function listPublic(q: CourseQuery) {
  const { rows, total } = await courseDao.list(q);
  const briefs = await courseDao.teacherBriefByCourseIds(rows.map((r) => r.id));
  const list = rows.map((course) => ({
    ...course,
    teachers: briefs.filter((b) => b.courseId === course.id).map((b) => ({ id: b.id, name: b.name }))
  }));
  return { list, total, page: q.page, pageSize: q.pageSize };
}

/** 课程详情(契约 2.11;未录入任教关系返回空数组,不做推断 P03) */
export async function detailPublic(id: number) {
  const course = await courseDao.findById(id);
  if (!course) throw new HttpError(404, 'NOT_FOUND', '课程不存在');
  const relations = await courseDao.listRelationsByCourse(id);
  return { ...course, teachers: relations.map(toTeacherItem) };
}

/** 管理端列表(契约 3.16) */
export async function listAdmin(q: CourseQuery) {
  return listPublic(q);
}

export async function detailAdmin(id: number) {
  return detailPublic(id);
}

export async function create(input: CourseUpsert): Promise<{ id: number }> {
  const dup = await courseDao.findByCode(input.code);
  if (dup) throw new HttpError(400, 'VALIDATION_ERROR', '课程代码已存在');
  const id = await courseDao.insertCourse({
    name: input.name,
    code: input.code,
    semester: input.semester ?? null,
    description: input.description ?? null
  });
  return { id };
}

export async function update(id: number, input: CourseUpsert): Promise<void> {
  const course = await courseDao.findById(id);
  if (!course) throw new HttpError(404, 'NOT_FOUND', '课程不存在');
  const dup = await courseDao.findByCode(input.code, id);
  if (dup) throw new HttpError(400, 'VALIDATION_ERROR', '课程代码已存在');
  await courseDao.updateCourse(id, {
    name: input.name,
    code: input.code,
    semester: input.semester ?? null,
    description: input.description ?? null
  });
}

/** 删除保护:存在任教关系 → 409(契约 3.16) */
export async function remove(id: number): Promise<{ id: number }> {
  const course = await courseDao.findById(id);
  if (!course) throw new HttpError(404, 'NOT_FOUND', '课程不存在');
  const count = await courseDao.countRelations(id);
  if (count > 0) {
    throw new HttpError(409, 'CONFLICT', `该课程仍有 ${count} 条任教关系,请先删除任教关系`);
  }
  await courseDao.removeCourse(id);
  return { id };
}

/** 任教关系管理(契约 3.18) */
export async function listRelations(courseId: number) {
  const course = await courseDao.findById(courseId);
  if (!course) throw new HttpError(404, 'NOT_FOUND', '课程不存在');
  const relations = await courseDao.listRelationsByCourse(courseId);
  return { list: relations.map(toTeacherItem) };
}

export async function addRelation(courseId: number, input: CourseTeacherUpsert): Promise<{ id: number }> {
  const course = await courseDao.findById(courseId);
  if (!course) throw new HttpError(404, 'NOT_FOUND', '课程不存在');
  const teacher = await teacherDao.findById(input.teacherId);
  if (!teacher) throw new HttpError(400, 'VALIDATION_ERROR', 'teacherId 对应的教师不存在');
  if (input.locationId !== undefined) {
    const loc = await locationDao.findById(input.locationId);
    if (!loc) throw new HttpError(400, 'VALIDATION_ERROR', 'locationId 对应的地点不存在');
  }
  const dup = await courseDao.existsRelation(courseId, input.teacherId);
  if (dup) throw new HttpError(409, 'CONFLICT', '该教师已关联此课程');
  const id = await courseDao.insertRelation({
    courseId,
    teacherId: input.teacherId,
    locationId: input.locationId ?? null,
    schedule: input.schedule ?? null
  });
  return { id };
}

export async function removeRelation(courseId: number, relationId: number): Promise<{ id: number }> {
  const course = await courseDao.findById(courseId);
  if (!course) throw new HttpError(404, 'NOT_FOUND', '课程不存在');
  const relation = await courseDao.findRelationById(relationId);
  if (!relation || relation.courseId !== courseId) throw new HttpError(404, 'NOT_FOUND', '任教关系不存在');
  await courseDao.removeRelation(relationId);
  return { id: relationId };
}
