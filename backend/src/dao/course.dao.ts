import { execute, insert, query, queryOne } from '../config/db';

export interface CourseRow {
  id: number;
  name: string;
  code: string;
  semester: string | null;
  description: string | null;
  updatedAt: string;
}

export interface CourseTeacherRow {
  relationId: number;
  courseId: number;
  teacherId: number;
  teacherName: string;
  teacherTitle: string | null;
  schedule: string | null;
  locationId: number | null;
  locationName: string | null;
  officeLocationId: number | null;
  officeName: string | null;
  officeHours: string | null;
}

export async function list(q: { keyword?: string; semester?: string; page: number; pageSize: number }): Promise<{ rows: CourseRow[]; total: number }> {
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (q.keyword) {
    where.push("(c.name LIKE CONCAT('%', ?, '%') OR c.code LIKE CONCAT('%', ?, '%'))");
    params.push(q.keyword, q.keyword);
  }
  if (q.semester) {
    where.push('c.semester = ?');
    params.push(q.semester);
  }
  const whereSql = where.join(' AND ');
  const rows = await query<CourseRow[]>(
    `SELECT c.id, c.name, c.code, c.semester, c.description, c.updated_at AS updatedAt
     FROM course c WHERE ${whereSql}
     ORDER BY c.name ASC, c.id ASC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM course c WHERE ${whereSql}`, params);
  return { rows, total: totalRow?.total ?? 0 };
}

export async function findById(id: number): Promise<CourseRow | null> {
  return queryOne<CourseRow>(
    'SELECT id, name, code, semester, description, updated_at AS updatedAt FROM course WHERE id = ?',
    [id]
  );
}

export async function findByCode(code: string, excludeId?: number): Promise<CourseRow | null> {
  if (excludeId !== undefined) {
    return queryOne<CourseRow>('SELECT id, code FROM course WHERE code = ? AND id <> ?', [code, excludeId]);
  }
  return queryOne<CourseRow>('SELECT id, code FROM course WHERE code = ?', [code]);
}

/** 某课程的全部任教关系(契约 2.11/3.18;未录入返回空数组,不做推断 P03) */
export async function listRelationsByCourse(courseId: number): Promise<CourseTeacherRow[]> {
  return query<CourseTeacherRow[]>(
    `SELECT ct.id AS relationId, ct.course_id AS courseId, t.id AS teacherId,
            t.name AS teacherName, t.title AS teacherTitle, ct.schedule,
            ct.location_id AS locationId, l.name AS locationName,
            t.office_location_id AS officeLocationId, ol.name AS officeName, t.office_hours AS officeHours
     FROM course_teacher ct
     JOIN teacher t ON t.id = ct.teacher_id
     LEFT JOIN location l ON l.id = ct.location_id
     LEFT JOIN location ol ON ol.id = t.office_location_id
     WHERE ct.course_id = ?
     ORDER BY ct.id ASC`,
    [courseId]
  );
}

export async function findRelationById(relationId: number): Promise<CourseTeacherRow | null> {
  return queryOne<CourseTeacherRow>(
    `SELECT ct.id AS relationId, ct.course_id AS courseId, t.id AS teacherId, ct.schedule
     FROM course_teacher ct JOIN teacher t ON t.id = ct.teacher_id
     WHERE ct.id = ?`,
    [relationId]
  );
}

export async function existsRelation(courseId: number, teacherId: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    'SELECT id FROM course_teacher WHERE course_id = ? AND teacher_id = ?',
    [courseId, teacherId]
  );
  return row !== null;
}

export async function insertRelation(data: {
  courseId: number;
  teacherId: number;
  locationId: number | null;
  schedule: string | null;
}): Promise<number> {
  return insert(
    'INSERT INTO course_teacher (course_id, teacher_id, location_id, schedule) VALUES (?, ?, ?, ?)',
    [data.courseId, data.teacherId, data.locationId, data.schedule]
  );
}

export async function removeRelation(relationId: number): Promise<number> {
  return execute('DELETE FROM course_teacher WHERE id = ?', [relationId]);
}

export async function countRelations(courseId: number): Promise<number> {
  const row = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM course_teacher WHERE course_id = ?',
    [courseId]
  );
  return row?.total ?? 0;
}

export async function insertCourse(data: {
  name: string;
  code: string;
  semester: string | null;
  description: string | null;
}): Promise<number> {
  return insert(
    'INSERT INTO course (name, code, semester, description) VALUES (?, ?, ?, ?)',
    [data.name, data.code, data.semester, data.description]
  );
}

export async function updateCourse(id: number, data: {
  name: string;
  code: string;
  semester: string | null;
  description: string | null;
}): Promise<number> {
  return execute(
    'UPDATE course SET name = ?, code = ?, semester = ?, description = ? WHERE id = ?',
    [data.name, data.code, data.semester, data.description, id]
  );
}

export async function removeCourse(id: number): Promise<number> {
  return execute('DELETE FROM course WHERE id = ?', [id]);
}

/** 批量取课程任教教师简要信息(列表页,契约 2.10;courseIds 经 mysql2 IN 展开参数化) */
export async function teacherBriefByCourseIds(courseIds: number[]): Promise<Array<{ courseId: number; id: number; name: string }>> {
  if (courseIds.length === 0) return [];
  return query<Array<{ courseId: number; id: number; name: string }>>(
    `SELECT ct.course_id AS courseId, t.id, t.name
     FROM course_teacher ct JOIN teacher t ON t.id = ct.teacher_id
     WHERE ct.course_id IN (?)
     ORDER BY t.name ASC`,
    [courseIds]
  );
}
