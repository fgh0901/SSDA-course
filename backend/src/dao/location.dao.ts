import { execute, insert, query, queryOne } from '../config/db';

export interface LocationRow {
  id: number;
  name: string;
  campus: string;
  building: string | null;
  floor: string | null;
  room: string | null;
  description: string | null;
  updatedAt: string;
}

export async function list(q: {
  keyword?: string;
  campus?: string;
  building?: string;
  floor?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: LocationRow[]; total: number }> {
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (q.keyword) {
    where.push('l.name LIKE CONCAT(\'%\', ?, \'%\')');
    params.push(q.keyword);
  }
  if (q.campus) {
    where.push('l.campus = ?');
    params.push(q.campus);
  }
  if (q.building) {
    where.push('l.building = ?');
    params.push(q.building);
  }
  if (q.floor) {
    where.push('l.floor = ?');
    params.push(q.floor);
  }
  const whereSql = where.join(' AND ');
  const rows = await query<LocationRow[]>(
    `SELECT l.id, l.name, l.campus, l.building, l.floor, l.room, l.description, l.updated_at AS updatedAt
     FROM location l WHERE ${whereSql}
     ORDER BY l.campus ASC, l.name ASC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM location l WHERE ${whereSql}`, params);
  return { rows, total: totalRow?.total ?? 0 };
}

export async function findById(id: number): Promise<LocationRow | null> {
  return queryOne<LocationRow>(
    'SELECT id, name, campus, building, floor, room, description, updated_at AS updatedAt FROM location WHERE id = ?',
    [id]
  );
}

/** 被指南/活动/教师办公室/上课教室任一引用的次数(删除保护,契约 3.15) */
export async function countReferences(locationId: number): Promise<number> {
  const row = await queryOne<{ total: number }>(
    `SELECT (SELECT COUNT(*) FROM service_guide WHERE location_id = ?)
          + (SELECT COUNT(*) FROM campus_activity WHERE location_id = ?)
          + (SELECT COUNT(*) FROM teacher WHERE office_location_id = ?)
          + (SELECT COUNT(*) FROM course_teacher WHERE location_id = ?) AS total`,
    [locationId, locationId, locationId, locationId]
  );
  return row?.total ?? 0;
}

export async function insertLocation(data: {
  name: string;
  campus: string;
  building: string | null;
  floor: string | null;
  room: string | null;
  description: string | null;
}): Promise<number> {
  return insert(
    'INSERT INTO location (name, campus, building, floor, room, description) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.campus, data.building, data.floor, data.room, data.description]
  );
}

export async function updateLocation(id: number, data: {
  name: string;
  campus: string;
  building: string | null;
  floor: string | null;
  room: string | null;
  description: string | null;
}): Promise<number> {
  return execute(
    'UPDATE location SET name = ?, campus = ?, building = ?, floor = ?, room = ?, description = ? WHERE id = ?',
    [data.name, data.campus, data.building, data.floor, data.room, data.description, id]
  );
}

export async function removeLocation(id: number): Promise<number> {
  return execute('DELETE FROM location WHERE id = ?', [id]);
}
