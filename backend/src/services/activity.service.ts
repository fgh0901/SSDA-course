import * as activityDao from '../dao/activity.dao';
import type { ActivityRow } from '../dao/activity.dao';
import * as locationDao from '../dao/location.dao';
import { HttpError } from '../utils/http';
import type { ActivityQuery, ActivityUpsert } from '../validators/activity.schema';

function toListItem(row: ActivityRow) {
  return {
    id: row.id,
    title: row.title,
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.locationId !== null && row.locationName !== null ? { id: row.locationId, name: row.locationName } : null,
    signupMethod: row.signupMethod,
    targetAudience: row.targetAudience,
    isEnabled: row.isEnabled,
    updatedAt: row.updatedAt
  };
}

/** 学生端列表(契约 2.7,time 筛选 upcoming/past) */
export async function listPublic(q: ActivityQuery) {
  const { rows, total } = await activityDao.listPublic(q);
  return { list: rows.map(toListItem), total, page: q.page, pageSize: q.pageSize };
}

/** 学生端详情(契约 2.8) */
export async function detailPublic(id: number) {
  const row = await activityDao.findPublicById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '活动不存在或已停用');
  return { ...toListItem(row), description: row.description };
}

/** 管理端列表(契约 3.14,含停用) */
export async function listAdmin(q: { keyword?: string; isEnabled?: number; page: number; pageSize: number }) {
  const { rows, total } = await activityDao.listAdmin(q);
  return { list: rows.map(toListItem), total, page: q.page, pageSize: q.pageSize };
}

export async function detailAdmin(id: number) {
  const row = await activityDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '活动不存在');
  return { ...toListItem(row), description: row.description };
}

async function assertLocationExists(locationId: number | undefined): Promise<void> {
  if (locationId === undefined) return;
  const loc = await locationDao.findById(locationId);
  if (!loc) throw new HttpError(400, 'VALIDATION_ERROR', 'locationId 对应的地点不存在');
}

export async function create(input: ActivityUpsert): Promise<{ id: number }> {
  await assertLocationExists(input.locationId);
  const id = await activityDao.insertActivity({
    title: input.title,
    startTime: input.startTime,
    endTime: input.endTime,
    locationId: input.locationId ?? null,
    signupMethod: input.signupMethod ?? null,
    targetAudience: input.targetAudience ?? null,
    description: input.description ?? null,
    isEnabled: input.isEnabled
  });
  return { id };
}

export async function update(id: number, input: ActivityUpsert): Promise<void> {
  const row = await activityDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '活动不存在');
  await assertLocationExists(input.locationId);
  await activityDao.updateActivity(id, {
    title: input.title,
    startTime: input.startTime,
    endTime: input.endTime,
    locationId: input.locationId ?? null,
    signupMethod: input.signupMethod ?? null,
    targetAudience: input.targetAudience ?? null,
    description: input.description ?? null,
    isEnabled: input.isEnabled
  });
}

export async function remove(id: number): Promise<{ id: number }> {
  const row = await activityDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '活动不存在');
  await activityDao.removeActivity(id);
  return { id };
}
