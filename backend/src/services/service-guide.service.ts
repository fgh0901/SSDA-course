import * as serviceDao from '../dao/service.dao';
import type { ServiceGuideRow } from '../dao/service.dao';
import * as locationDao from '../dao/location.dao';
import { HttpError } from '../utils/http';
import type { AdminServiceQuery, ServiceQuery, ServiceUpsert } from '../validators/service.schema';

function toLocation(row: ServiceGuideRow): { id: number; name: string; campus?: string; building: string | null; floor?: string | null; room: string | null } | null {
  if (row.locationId === null || row.locationName === null) return null;
  return {
    id: row.locationId,
    name: row.locationName,
    campus: row.locationCampus ?? undefined,
    building: row.locationBuilding,
    floor: row.locationFloor,
    room: row.locationRoom
  };
}

function toListItem(row: ServiceGuideRow) {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    location: toLocation(row),
    serviceTime: row.serviceTime,
    isEnabled: row.isEnabled,
    updatedAt: row.updatedAt
  };
}

/** 学生端列表(契约 2.5) */
export async function listPublic(q: ServiceQuery) {
  const { rows, total } = await serviceDao.listPublic(q);
  return { list: rows.map(toListItem), total, page: q.page, pageSize: q.pageSize };
}

/** 学生端详情(契约 2.6,停用 404) */
export async function detailPublic(id: number) {
  const row = await serviceDao.findPublicById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '办事指南不存在或已停用');
  return { ...toListItem(row), materials: row.materials, process: row.process };
}

/** 管理端列表(契约 3.13,含停用) */
export async function listAdmin(q: AdminServiceQuery) {
  const { rows, total } = await serviceDao.listAdmin(q);
  return { list: rows.map(toListItem), total, page: q.page, pageSize: q.pageSize };
}

/** 管理端详情(编辑回显) */
export async function detailAdmin(id: number) {
  const row = await serviceDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '办事指南不存在');
  return { ...toListItem(row), materials: row.materials, process: row.process };
}

async function assertLocationExists(locationId: number | undefined): Promise<void> {
  if (locationId === undefined) return;
  const loc = await locationDao.findById(locationId);
  if (!loc) throw new HttpError(400, 'VALIDATION_ERROR', 'locationId 对应的地点不存在');
}

export async function create(input: ServiceUpsert): Promise<{ id: number }> {
  await assertLocationExists(input.locationId);
  const id = await serviceDao.insertGuide({
    title: input.title,
    department: input.department,
    locationId: input.locationId ?? null,
    serviceTime: input.serviceTime ?? null,
    materials: input.materials ?? null,
    process: input.process ?? null,
    isEnabled: input.isEnabled
  });
  return { id };
}

export async function update(id: number, input: ServiceUpsert): Promise<void> {
  const row = await serviceDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '办事指南不存在');
  await assertLocationExists(input.locationId);
  await serviceDao.updateGuide(id, {
    title: input.title,
    department: input.department,
    locationId: input.locationId ?? null,
    serviceTime: input.serviceTime ?? null,
    materials: input.materials ?? null,
    process: input.process ?? null,
    isEnabled: input.isEnabled
  });
}

export async function remove(id: number): Promise<{ id: number }> {
  const row = await serviceDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '办事指南不存在');
  await serviceDao.removeGuide(id);
  return { id };
}
