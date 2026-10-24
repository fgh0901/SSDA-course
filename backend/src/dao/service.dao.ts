import { execute, insert, query, queryOne } from '../config/db';

export interface ServiceGuideRow {
  id: number;
  title: string;
  department: string;
  locationId: number | null;
  serviceTime: string | null;
  materials: string | null;
  process: string | null;
  isEnabled: number;
  updatedAt: string;
  locationName: string | null;
  locationCampus: string | null;
  locationBuilding: string | null;
  locationFloor: string | null;
  locationRoom: string | null;
}

const COLS = `s.id, s.title, s.department, s.location_id AS locationId, s.service_time AS serviceTime,
  s.materials, s.process, s.is_enabled AS isEnabled, s.updated_at AS updatedAt,
  l.name AS locationName, l.campus AS locationCampus, l.building AS locationBuilding,
  l.floor AS locationFloor, l.room AS locationRoom`;

function buildFilters(keyword?: string, locationId?: number, isEnabled?: number): { whereSql: string; params: unknown[] } {
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (keyword) {
    where.push("(s.title LIKE CONCAT('%', ?, '%') OR s.department LIKE CONCAT('%', ?, '%'))");
    params.push(keyword, keyword);
  }
  if (locationId !== undefined) {
    where.push('s.location_id = ?');
    params.push(locationId);
  }
  if (isEnabled !== undefined) {
    where.push('s.is_enabled = ?');
    params.push(isEnabled);
  }
  return { whereSql: where.join(' AND '), params };
}

/** 学生端列表:仅上架,按 updatedAt 倒序(契约 2.5) */
export async function listPublic(q: { keyword?: string; locationId?: number; page: number; pageSize: number }) {
  const { whereSql, params } = buildFilters(q.keyword, q.locationId, 1);
  const rows = await query<ServiceGuideRow[]>(
    `SELECT ${COLS} FROM service_guide s LEFT JOIN location l ON l.id = s.location_id
     WHERE ${whereSql} ORDER BY s.updated_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM service_guide s WHERE ${whereSql}`, params);
  return { rows, total: totalRow?.total ?? 0 };
}

/** 管理端列表:含停用项(契约 3.13) */
export async function listAdmin(q: { keyword?: string; isEnabled?: number; page: number; pageSize: number }) {
  const { whereSql, params } = buildFilters(q.keyword, undefined, q.isEnabled);
  const rows = await query<ServiceGuideRow[]>(
    `SELECT ${COLS} FROM service_guide s LEFT JOIN location l ON l.id = s.location_id
     WHERE ${whereSql} ORDER BY s.updated_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM service_guide s WHERE ${whereSql}`, params);
  return { rows, total: totalRow?.total ?? 0 };
}

export async function findPublicById(id: number): Promise<ServiceGuideRow | null> {
  return queryOne<ServiceGuideRow>(
    `SELECT ${COLS} FROM service_guide s LEFT JOIN location l ON l.id = s.location_id
     WHERE s.id = ? AND s.is_enabled = 1`,
    [id]
  );
}

export async function findAdminById(id: number): Promise<ServiceGuideRow | null> {
  return queryOne<ServiceGuideRow>(
    `SELECT ${COLS} FROM service_guide s LEFT JOIN location l ON l.id = s.location_id WHERE s.id = ?`,
    [id]
  );
}

export async function insertGuide(data: {
  title: string;
  department: string;
  locationId: number | null;
  serviceTime: string | null;
  materials: string | null;
  process: string | null;
  isEnabled: number;
}, exec?: import('../config/db').Exec): Promise<number> {
  return insert(
    `INSERT INTO service_guide (title, department, location_id, service_time, materials, process, is_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.department, data.locationId, data.serviceTime, data.materials, data.process, data.isEnabled],
    exec
  );
}

export async function updateGuide(id: number, data: {
  title: string;
  department: string;
  locationId: number | null;
  serviceTime: string | null;
  materials: string | null;
  process: string | null;
  isEnabled: number;
}, exec?: import('../config/db').Exec): Promise<number> {
  return execute(
    `UPDATE service_guide
     SET title = ?, department = ?, location_id = ?, service_time = ?, materials = ?, process = ?, is_enabled = ?
     WHERE id = ?`,
    [data.title, data.department, data.locationId, data.serviceTime, data.materials, data.process, data.isEnabled, id],
    exec
  );
}

export async function removeGuide(id: number): Promise<number> {
  return execute('DELETE FROM service_guide WHERE id = ?', [id]);
}
