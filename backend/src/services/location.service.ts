import * as locationDao from '../dao/location.dao';
import { HttpError } from '../utils/http';
import type { LocationUpsert } from '../validators/location.schema';

/** 学生端地点查询(契约 2.9) */
export async function list(q: {
  keyword?: string;
  campus?: string;
  building?: string;
  floor?: string;
  page: number;
  pageSize: number;
}) {
  const { rows, total } = await locationDao.list(q);
  return { list: rows, total, page: q.page, pageSize: q.pageSize };
}

export async function detail(id: number) {
  const row = await locationDao.findById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '地点不存在');
  return row;
}

/** 管理端列表(契约 3.15) */
export async function listAdmin(q: { keyword?: string; campus?: string; building?: string; floor?: string; page: number; pageSize: number }) {
  const { rows, total } = await locationDao.list(q);
  return { list: rows, total, page: q.page, pageSize: q.pageSize };
}

export async function create(input: LocationUpsert): Promise<{ id: number }> {
  const id = await locationDao.insertLocation({
    name: input.name,
    campus: input.campus,
    building: input.building ?? null,
    floor: input.floor ?? null,
    room: input.room ?? null,
    description: input.description ?? null
  });
  return { id };
}

export async function update(id: number, input: LocationUpsert): Promise<void> {
  const row = await locationDao.findById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '地点不存在');
  await locationDao.updateLocation(id, {
    name: input.name,
    campus: input.campus,
    building: input.building ?? null,
    floor: input.floor ?? null,
    room: input.room ?? null,
    description: input.description ?? null
  });
}

/** 删除保护:被引用 → 409(契约 3.15) */
export async function remove(id: number): Promise<{ id: number }> {
  const row = await locationDao.findById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '地点不存在');
  const count = await locationDao.countReferences(id);
  if (count > 0) {
    throw new HttpError(409, 'CONFLICT', `该地点仍被 ${count} 条记录引用(指南/活动/办公室/上课教室),请先解除引用`);
  }
  await locationDao.removeLocation(id);
  return { id };
}
