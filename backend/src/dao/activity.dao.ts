import { execute, insert, query, queryOne, type Exec } from '../config/db';

export interface ActivityRow {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  locationId: number | null;
  signupMethod: string | null;
  targetAudience: string | null;
  description: string | null;
  isEnabled: number;
  updatedAt: string;
  locationName: string | null;
}

const COLS = `a.id, a.title, a.start_time AS startTime, a.end_time AS endTime, a.location_id AS locationId,
  a.signup_method AS signupMethod, a.target_audience AS targetAudience, a.description, a.is_enabled AS isEnabled,
  a.updated_at AS updatedAt, l.name AS locationName`;

function buildFilters(keyword?: string, isEnabled?: number, time?: 'upcoming' | 'past'): { whereSql: string; params: unknown[] } {
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (keyword) {
    where.push("(a.title LIKE CONCAT('%', ?, '%') OR a.description LIKE CONCAT('%', ?, '%'))");
    params.push(keyword, keyword);
  }
  if (isEnabled !== undefined) {
    where.push('a.is_enabled = ?');
    params.push(isEnabled);
  }
  if (time === 'upcoming') {
    where.push('a.start_time > NOW()');
  } else if (time === 'past') {
    where.push('a.end_time < NOW()');
  }
  return { whereSql: where.join(' AND '), params };
}

/** 学生端列表:仅上架,按 startTime 倒序(契约 2.7) */
export async function listPublic(q: { keyword?: string; time?: 'upcoming' | 'past'; page: number; pageSize: number }) {
  const { whereSql, params } = buildFilters(q.keyword, 1, q.time);
  const rows = await query<ActivityRow[]>(
    `SELECT ${COLS} FROM campus_activity a LEFT JOIN location l ON l.id = a.location_id
     WHERE ${whereSql} ORDER BY a.start_time DESC, a.id DESC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM campus_activity a WHERE ${whereSql}`, params);
  return { rows, total: totalRow?.total ?? 0 };
}

/** 管理端列表:含停用项(契约 3.14) */
export async function listAdmin(q: { keyword?: string; isEnabled?: number; page: number; pageSize: number }) {
  const { whereSql, params } = buildFilters(q.keyword, q.isEnabled);
  const rows = await query<ActivityRow[]>(
    `SELECT ${COLS} FROM campus_activity a LEFT JOIN location l ON l.id = a.location_id
     WHERE ${whereSql} ORDER BY a.start_time DESC, a.id DESC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM campus_activity a WHERE ${whereSql}`, params);
  return { rows, total: totalRow?.total ?? 0 };
}

export async function findPublicById(id: number): Promise<ActivityRow | null> {
  return queryOne<ActivityRow>(
    `SELECT ${COLS} FROM campus_activity a LEFT JOIN location l ON l.id = a.location_id
     WHERE a.id = ? AND a.is_enabled = 1`,
    [id]
  );
}

export async function findAdminById(id: number): Promise<ActivityRow | null> {
  return queryOne<ActivityRow>(
    `SELECT ${COLS} FROM campus_activity a LEFT JOIN location l ON l.id = a.location_id WHERE a.id = ?`,
    [id]
  );
}

export async function insertActivity(data: {
  title: string;
  startTime: string;
  endTime: string;
  locationId: number | null;
  signupMethod: string | null;
  targetAudience: string | null;
  description: string | null;
  isEnabled: number;
}, exec?: Exec): Promise<number> {
  return insert(
    `INSERT INTO campus_activity (title, start_time, end_time, location_id, signup_method, target_audience, description, is_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.startTime, data.endTime, data.locationId, data.signupMethod, data.targetAudience, data.description, data.isEnabled],
    exec
  );
}

export async function updateActivity(id: number, data: {
  title: string;
  startTime: string;
  endTime: string;
  locationId: number | null;
  signupMethod: string | null;
  targetAudience: string | null;
  description: string | null;
  isEnabled: number;
}, exec?: Exec): Promise<number> {
  return execute(
    `UPDATE campus_activity
     SET title = ?, start_time = ?, end_time = ?, location_id = ?, signup_method = ?, target_audience = ?, description = ?, is_enabled = ?
     WHERE id = ?`,
    [data.title, data.startTime, data.endTime, data.locationId, data.signupMethod, data.targetAudience, data.description, data.isEnabled, id],
    exec
  );
}

export async function removeActivity(id: number): Promise<number> {
  return execute('DELETE FROM campus_activity WHERE id = ?', [id]);
}
