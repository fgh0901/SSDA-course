import { insert, query, queryOne, type Exec } from '../config/db';

export interface ChangeLogRow {
  id: number;
  knowledgeId: number;
  adminId: number;
  adminUsername: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

export async function insertChangeLog(data: {
  knowledgeId: number;
  adminId: number;
  action: string;
  detail?: string;
}, exec?: Exec): Promise<number> {
  return insert(
    'INSERT INTO knowledge_change_log (knowledge_id, admin_id, action, detail) VALUES (?, ?, ?, ?)',
    [data.knowledgeId, data.adminId, data.action, data.detail ?? null],
    exec
  );
}

/** 变更日志列表,按时间倒序(契约 3.11) */
export async function listByKnowledge(knowledgeId: number, page: number, pageSize: number): Promise<{ rows: ChangeLogRow[]; total: number }> {
  const rows = await query<ChangeLogRow[]>(
    `SELECT l.id, l.knowledge_id AS knowledgeId, l.admin_id AS adminId,
            a.username AS adminUsername, l.action, l.detail, l.created_at AS createdAt
     FROM knowledge_change_log l JOIN admin_user a ON a.id = l.admin_id
     WHERE l.knowledge_id = ?
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT ? OFFSET ?`,
    [knowledgeId, pageSize, (page - 1) * pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM knowledge_change_log WHERE knowledge_id = ?',
    [knowledgeId]
  );
  return { rows, total: totalRow?.total ?? 0 };
}
