import { execute, insert, query, queryOne } from '../config/db';

export interface TeacherRow {
  id: number;
  name: string;
  title: string | null;
  officeLocationId: number | null;
  officeHours: string | null;
  officeName: string | null;
  updatedAt: string;
}

const COLS = `t.id, t.name, t.title, t.office_location_id AS officeLocationId,
  t.office_hours AS officeHours, ol.name AS officeName, t.updated_at AS updatedAt`;

/** 教师列表(仅公开字段,契约 2.12,按 name 升序) */
export async function list(q: { keyword?: string; page: number; pageSize: number }): Promise<{ rows: TeacherRow[]; total: number }> {
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (q.keyword) {
    where.push('t.name LIKE CONCAT(\'%\', ?, \'%\')');
    params.push(q.keyword);
  }
  const whereSql = where.join(' AND ');
  const rows = await query<TeacherRow[]>(
    `SELECT ${COLS} FROM teacher t LEFT JOIN location ol ON ol.id = t.office_location_id
     WHERE ${whereSql} ORDER BY t.name ASC, t.id ASC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM teacher t WHERE ${whereSql}`, params);
  return { rows, total: totalRow?.total ?? 0 };
}

export async function findById(id: number): Promise<TeacherRow | null> {
  return queryOne<TeacherRow>(
    `SELECT ${COLS} FROM teacher t LEFT JOIN location ol ON ol.id = t.office_location_id WHERE t.id = ?`,
    [id]
  );
}

/** 批量取教师任教课程简要信息(列表页,契约 2.12) */
export async function courseBriefByTeacherIds(teacherIds: number[]): Promise<Array<{ teacherId: number; id: number; name: string }>> {
  if (teacherIds.length === 0) return [];
  return query<Array<{ teacherId: number; id: number; name: string }>>(
    `SELECT ct.teacher_id AS teacherId, c.id, c.name
     FROM course_teacher ct JOIN course c ON c.id = ct.course_id
     WHERE ct.teacher_id IN (?)
     ORDER BY c.name ASC`,
    [teacherIds]
  );
}

/** 教师详情的任教课程(含上课时间与地点;未录入返回空数组,不做推断 P03) */
export async function courseDetailByTeacherId(teacherId: number): Promise<Array<{
  relationId: number;
  courseId: number;
  courseName: string;
  code: string;
  schedule: string | null;
  locationId: number | null;
  locationName: string | null;
}>> {
  return query(
    `SELECT ct.id AS relationId, c.id AS courseId, c.name AS courseName, c.code, ct.schedule,
            ct.location_id AS locationId, l.name AS locationName
     FROM course_teacher ct
     JOIN course c ON c.id = ct.course_id
     LEFT JOIN location l ON l.id = ct.location_id
     WHERE ct.teacher_id = ?
     ORDER BY c.name ASC`,
    [teacherId]
  );
}

export async function countRelations(teacherId: number): Promise<number> {
  const row = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM course_teacher WHERE teacher_id = ?',
    [teacherId]
  );
  return row?.total ?? 0;
}

export async function insertTeacher(data: {
  name: string;
  title: string | null;
  officeLocationId: number | null;
  officeHours: string | null;
}): Promise<number> {
  return insert(
    'INSERT INTO teacher (name, title, office_location_id, office_hours) VALUES (?, ?, ?, ?)',
    [data.name, data.title, data.officeLocationId, data.officeHours]
  );
}

export async function updateTeacher(id: number, data: {
  name: string;
  title: string | null;
  officeLocationId: number | null;
  officeHours: string | null;
}): Promise<number> {
  return execute(
    'UPDATE teacher SET name = ?, title = ?, office_location_id = ?, office_hours = ? WHERE id = ?',
    [data.name, data.title, data.officeLocationId, data.officeHours, id]
  );
}

export async function removeTeacher(id: number): Promise<number> {
  return execute('DELETE FROM teacher WHERE id = ?', [id]);
}
