import * as changeLogDao from '../dao/change-log.dao';
import * as categoryDao from '../dao/category.dao';
import * as knowledgeDao from '../dao/knowledge.dao';
import type { KnowledgeRow } from '../dao/knowledge.dao';
import { withTransaction } from '../config/db';
import { HttpError } from '../utils/http';
import { todayStr } from '../utils/datetime';
import { summarize } from '../utils/text';
import type { AdminKnowledgeQuery, KnowledgeUpsert } from '../validators/knowledge.schema';

export interface PublicKnowledgeItem extends Omit<KnowledgeRow, 'content'> {
  summary: string;
}

function toListItem(row: KnowledgeRow): PublicKnowledgeItem {
  const { content, ...rest } = row;
  return { ...rest, summary: summarize(content) };
}

/** 学生端列表(契约 2.3,TC-01/02/03/05/09) */
export async function list(q: {
  keyword?: string;
  categoryId?: number;
  page: number;
  pageSize: number;
}) {
  if (q.categoryId !== undefined) {
    const category = await categoryDao.findById(q.categoryId);
    if (!category || category.isEnabled !== 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'categoryId 对应的分类不存在或已停用');
    }
  }
  const { rows, total } = await knowledgeDao.listPublic(q);
  return { list: rows.map(toListItem), total, page: q.page, pageSize: q.pageSize };
}

/** 管理端列表:全部状态可见,支持状态筛选(契约 3.2,缺省返回全部状态) */
export async function listAdmin(q: AdminKnowledgeQuery) {
  const { rows, total } = await knowledgeDao.listAdmin(q);
  return { list: rows.map(toListItem), total, page: q.page, pageSize: q.pageSize };
}

/** 服务端计算过期标识(避免客户端时钟偏差,契约 2.4/TC-09) */
export function computeIsExpired(effectiveUntil: string | null): boolean {
  return effectiveUntil !== null && effectiveUntil < todayStr();
}

/** 学生端详情:仅 published;draft/pending_review/takedown 一律 404(契约 2.4) */
export async function detailPublic(id: number) {
  const row = await knowledgeDao.findPublicById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在或未发布');
  return { ...row, isExpired: computeIsExpired(row.effectiveUntil) };
}

/** 管理端详情(契约 3.3) */
export async function detailAdmin(id: number) {
  const row = await knowledgeDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在');
  return { ...row, isExpired: computeIsExpired(row.effectiveUntil) };
}

async function assertCategoryUsable(categoryId: number): Promise<void> {
  const category = await categoryDao.findById(categoryId);
  if (!category || category.isEnabled !== 1) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'categoryId 对应的分类不存在或已停用');
  }
}

/** 新增:初始 draft,写变更日志(契约 3.4,TC-06) */
export async function create(input: KnowledgeUpsert, adminId: number): Promise<{ id: number; status: string }> {
  await assertCategoryUsable(input.categoryId);
  const id = await withTransaction(async (conn) => {
    const newId = await knowledgeDao.createKnowledge({
      categoryId: input.categoryId,
      title: input.title,
      content: input.content,
      source: input.source,
      isVerified: input.isVerified,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? null
    }, conn);
    await changeLogDao.insertChangeLog(
      { knowledgeId: newId, adminId, action: 'create', detail: '新增知识,初始状态 draft' },
      conn
    );
    return newId;
  });
  return { id, status: 'draft' };
}

/** 编辑:published/takedown 保存后自动回退 draft(先审后发红线,契约 3.5) */
export async function update(id: number, input: KnowledgeUpsert, adminId: number): Promise<{ id: number; status: string }> {
  const row = await knowledgeDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在');
  await assertCategoryUsable(input.categoryId);
  const status: KnowledgeRow['status'] =
    row.status === 'published' || row.status === 'takedown' ? 'draft' : row.status;
  await withTransaction(async (conn) => {
    await knowledgeDao.updateKnowledge(id, {
      categoryId: input.categoryId,
      title: input.title,
      content: input.content,
      source: input.source,
      isVerified: input.isVerified,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? null
    }, conn);
    await knowledgeDao.updateStatus(id, status, conn);
    await changeLogDao.insertChangeLog(
      { knowledgeId: id, adminId, action: 'update', detail: `编辑知识;状态由 ${row.status} 变为 ${status}` },
      conn
    );
  });
  return { id, status };
}

/** 物理删除:仅 draft 可删,其余 409(契约 3.6) */
export async function remove(id: number): Promise<{ id: number }> {
  const row = await knowledgeDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在');
  if (row.status !== 'draft') {
    throw new HttpError(409, 'CONFLICT', '仅草稿状态的知识可删除,其他状态请使用下架');
  }
  await knowledgeDao.removeKnowledge(id);
  return { id };
}

/** 提交审核:draft|takedown → pending_review(契约 3.7) */
export async function submitReview(id: number, adminId: number): Promise<{ id: number; status: string }> {
  const row = await knowledgeDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在');
  if (row.status !== 'draft' && row.status !== 'takedown') {
    throw new HttpError(409, 'CONFLICT', '当前状态不允许提交审核(仅草稿或已下架可提交)');
  }
  await withTransaction(async (conn) => {
    await knowledgeDao.updateStatus(id, 'pending_review', conn);
    await changeLogDao.insertChangeLog(
      { knowledgeId: id, adminId, action: 'submit_review', detail: '提交审核' },
      conn
    );
  });
  return { id, status: 'pending_review' };
}

/** 审核:pending_review → published / draft(驳回必填备注,契约 3.8) */
export async function review(id: number, action: 'publish' | 'reject', comment: string | undefined, adminId: number): Promise<{ id: number; status: string }> {
  const row = await knowledgeDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在');
  if (row.status !== 'pending_review') {
    throw new HttpError(409, 'CONFLICT', '当前状态不是待审核,无法执行审核操作');
  }
  const nextStatus: KnowledgeRow['status'] = action === 'publish' ? 'published' : 'draft';
  const detail =
    action === 'publish'
      ? comment
        ? `审核通过并发布;备注:${comment}`
        : '审核通过并发布'
      : `审核驳回;原因:${comment ?? ''}`;
  await withTransaction(async (conn) => {
    await knowledgeDao.updateStatus(id, nextStatus, conn);
    await changeLogDao.insertChangeLog(
      { knowledgeId: id, adminId, action: action === 'publish' ? 'review_publish' : 'review_reject', detail },
      conn
    );
  });
  return { id, status: nextStatus };
}

/** 下架:published → takedown(契约 3.9,TC-09) */
export async function takedown(id: number, adminId: number): Promise<{ id: number; status: string }> {
  const row = await knowledgeDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在');
  if (row.status !== 'published') {
    throw new HttpError(409, 'CONFLICT', '仅已发布状态的知识可下架');
  }
  await withTransaction(async (conn) => {
    await knowledgeDao.updateStatus(id, 'takedown', conn);
    await changeLogDao.insertChangeLog(
      { knowledgeId: id, adminId, action: 'takedown', detail: '下架知识' },
      conn
    );
  });
  return { id, status: 'takedown' };
}

/** 过期/临期工作台(契约 3.10):仅按日期识别,P05 红线 */
export async function listExpired(state: 'expired' | 'expiring' | undefined, days: number, page: number, pageSize: number) {
  const { rows, total } = await knowledgeDao.listExpired({ state, days, page, pageSize });
  const list = rows.map((row) => {
    const expired = row.effectiveUntil !== null && row.effectiveUntil < todayStr();
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      effectiveUntil: row.effectiveUntil,
      state: expired ? 'expired' : 'expiring',
      ...(expired ? { daysOverdue: row.daysOverdue } : { daysRemaining: row.daysRemaining }),
      updatedAt: row.updatedAt
    };
  });
  return { list, total, page, pageSize };
}

/** 变更日志(契约 3.11) */
export async function changeLogs(id: number, page: number, pageSize: number) {
  const row = await knowledgeDao.findAdminById(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', '知识不存在');
  const { rows, total } = await changeLogDao.listByKnowledge(id, page, pageSize);
  return { list: rows, total, page, pageSize };
}
