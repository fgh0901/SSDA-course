import { execute, insert, query, queryOne, type Exec } from '../config/db';

export interface KnowledgeRow {
  id: number;
  categoryId: number;
  categoryName?: string;
  title: string;
  content: string;
  source: string;
  status: 'draft' | 'pending_review' | 'published' | 'takedown';
  isVerified: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

const COLS = `k.id, k.category_id AS categoryId, k.title, k.content, k.source, k.status,
  k.is_verified AS isVerified, k.effective_from AS effectiveFrom, k.effective_until AS effectiveUntil,
  k.created_at AS createdAt, k.updated_at AS updatedAt`;

/** 学生端列表:仅 published(含已过期,TC-09),支持关键词/分类筛选(契约 2.3) */
export async function listPublic(q: {
  keyword?: string;
  categoryId?: number;
  page: number;
  pageSize: number;
}): Promise<{ rows: KnowledgeRow[]; total: number }> {
  const where: string[] = ["k.status = 'published'"];
  const params: unknown[] = [];
  if (q.keyword) {
    where.push("(k.title LIKE CONCAT('%', ?, '%') OR k.content LIKE CONCAT('%', ?, '%'))");
    params.push(q.keyword, q.keyword);
  }
  if (q.categoryId !== undefined) {
    where.push('k.category_id = ?');
    params.push(q.categoryId);
  }
  const whereSql = where.join(' AND ');
  const rows = await query<KnowledgeRow[]>(
    `SELECT ${COLS}, c.name AS categoryName
     FROM knowledge k JOIN knowledge_category c ON c.id = k.category_id
     WHERE ${whereSql}
     ORDER BY k.updated_at DESC, k.id DESC
     LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM knowledge k WHERE ${whereSql}`,
    params
  );
  return { rows, total: totalRow?.total ?? 0 };
}

/** 管理端列表:状态可多值,缺省全部(契约 3.2) */
export async function listAdmin(q: {
  keyword?: string;
  categoryId?: number;
  status?: string[];
  isVerified?: number;
  page: number;
  pageSize: number;
}): Promise<{ rows: KnowledgeRow[]; total: number }> {
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (q.keyword) {
    where.push('k.title LIKE CONCAT(\'%\', ?, \'%\')');
    params.push(q.keyword);
  }
  if (q.categoryId !== undefined) {
    where.push('k.category_id = ?');
    params.push(q.categoryId);
  }
  if (q.status && q.status.length > 0) {
    where.push(`k.status IN (${q.status.map(() => '?').join(', ')})`);
    params.push(...q.status);
  }
  if (q.isVerified !== undefined) {
    where.push('k.is_verified = ?');
    params.push(q.isVerified);
  }
  const whereSql = where.join(' AND ');
  const rows = await query<KnowledgeRow[]>(
    `SELECT ${COLS}, c.name AS categoryName
     FROM knowledge k JOIN knowledge_category c ON c.id = k.category_id
     WHERE ${whereSql}
     ORDER BY k.updated_at DESC, k.id DESC
     LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM knowledge k WHERE ${whereSql}`,
    params
  );
  return { rows, total: totalRow?.total ?? 0 };
}

/** 学生端详情:仅 published 可见(调用方校验状态,TC-09) */
export async function findPublicById(id: number): Promise<KnowledgeRow | null> {
  return queryOne<KnowledgeRow>(
    `SELECT ${COLS}, c.name AS categoryName
     FROM knowledge k JOIN knowledge_category c ON c.id = k.category_id
     WHERE k.id = ? AND k.status = 'published'`,
    [id]
  );
}

/** 管理端详情:任意状态(契约 3.3) */
export async function findAdminById(id: number): Promise<KnowledgeRow | null> {
  return queryOne<KnowledgeRow>(
    `SELECT ${COLS}, c.name AS categoryName
     FROM knowledge k JOIN knowledge_category c ON c.id = k.category_id
     WHERE k.id = ?`,
    [id]
  );
}

export async function createKnowledge(data: {
  categoryId: number;
  title: string;
  content: string;
  source: string;
  isVerified: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
}, exec?: Exec): Promise<number> {
  return insert(
    `INSERT INTO knowledge (category_id, title, content, source, status, is_verified, effective_from, effective_until)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [data.categoryId, data.title, data.content, data.source, data.isVerified, data.effectiveFrom, data.effectiveUntil],
    exec
  );
}

export async function updateKnowledge(id: number, data: {
  categoryId: number;
  title: string;
  content: string;
  source: string;
  isVerified: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
}, exec?: Exec): Promise<number> {
  return execute(
    `UPDATE knowledge
     SET category_id = ?, title = ?, content = ?, source = ?, is_verified = ?, effective_from = ?, effective_until = ?
     WHERE id = ?`,
    [data.categoryId, data.title, data.content, data.source, data.isVerified, data.effectiveFrom, data.effectiveUntil, id],
    exec
  );
}

export async function updateStatus(id: number, status: KnowledgeRow['status'], exec?: Exec): Promise<number> {
  return execute('UPDATE knowledge SET status = ? WHERE id = ?', [status, id], exec);
}

export async function removeKnowledge(id: number, exec?: Exec): Promise<number> {
  return execute('DELETE FROM knowledge WHERE id = ?', [id], exec);
}

/** 过期/临期工作台(契约 3.10):published 且 effective_until 非空,
 *  只按日期识别,不做"自动标记真实有效"(P05 红线) */
export async function listExpired(q: {
  days: number;
  page: number;
  pageSize: number;
  state?: 'expired' | 'expiring';
}): Promise<{ rows: Array<KnowledgeRow & { daysOverdue: number; daysRemaining: number }>; total: number }> {
  const expiredCond = 'k.effective_until < CURDATE()';
  const expiringCond = '(k.effective_until >= CURDATE() AND k.effective_until <= DATE_ADD(CURDATE(), INTERVAL ? DAY))';
  const conds = q.state === 'expired' ? [expiredCond] : q.state === 'expiring' ? [expiringCond] : [expiredCond, expiringCond];
  const params: unknown[] = [];
  if (conds.length === 2 || q.state === 'expiring') params.push(q.days);
  const whereSql = conds.map((c) => `(${c})`).join(' OR ');
  const fullWhere = `k.status = 'published' AND k.effective_until IS NOT NULL AND (${whereSql})`;
  const rows = await query<Array<KnowledgeRow & { daysOverdue: number; daysRemaining: number }>>(
    `SELECT ${COLS}, c.name AS categoryName,
            GREATEST(DATEDIFF(CURDATE(), k.effective_until), 0) AS daysOverdue,
            GREATEST(DATEDIFF(k.effective_until, CURDATE()), 0) AS daysRemaining
     FROM knowledge k JOIN knowledge_category c ON c.id = k.category_id
     WHERE ${fullWhere}
     ORDER BY k.effective_until ASC, k.id ASC
     LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM knowledge k WHERE ${fullWhere}`,
    params
  );
  return { rows, total: totalRow?.total ?? 0 };
}
