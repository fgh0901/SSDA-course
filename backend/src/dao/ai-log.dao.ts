import { execute, insert, query, queryOne } from '../config/db';

export interface AiMessageRow {
  id: number;
  sessionKey: string;
  role: 'user' | 'assistant';
  content: string;
  sourcesJson: unknown;
  mode: string | null;
  retriever: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface AiLogFilters {
  sessionKey?: string;
  startDate?: string;
  endDate?: string;
}

function buildFilters(f: AiLogFilters): { whereSql: string; params: unknown[] } {
  const where: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (f.sessionKey) {
    where.push('s.session_key = ?');
    params.push(f.sessionKey);
  }
  if (f.startDate) {
    where.push('m.created_at >= ?');
    params.push(f.startDate);
  }
  if (f.endDate) {
    where.push('m.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(f.endDate);
  }
  return { whereSql: where.join(' AND '), params };
}

/** 首次对话惰性建会话(匿名 uuid,不关联身份) */
export async function findOrCreateSession(sessionKey: string): Promise<number> {
  await execute('INSERT IGNORE INTO ai_chat_session (session_key) VALUES (?)', [sessionKey]);
  const row = await queryOne<{ id: number }>('SELECT id FROM ai_chat_session WHERE session_key = ?', [sessionKey]);
  if (!row) throw new Error('AI 会话创建失败');
  return row.id;
}

export async function insertMessage(data: {
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  sourcesJson?: unknown;
  mode?: string;
  retriever?: string;
  latencyMs?: number;
}): Promise<number> {
  return insert(
    `INSERT INTO ai_chat_message (session_id, role, content, sources_json, mode, retriever, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.sessionId,
      data.role,
      data.content,
      data.sourcesJson !== undefined ? JSON.stringify(data.sourcesJson) : null,
      data.mode ?? null,
      data.retriever ?? null,
      data.latencyMs ?? null
    ]
  );
}

/** 管理端 AI 日志分页(契约 3.19) */
export async function listMessages(f: AiLogFilters & { page: number; pageSize: number }): Promise<{ rows: AiMessageRow[]; total: number }> {
  const { whereSql, params } = buildFilters(f);
  const rows = await query<AiMessageRow[]>(
    `SELECT m.id, s.session_key AS sessionKey, m.role, m.content, m.sources_json AS sourcesJson,
            m.mode, m.retriever, m.latency_ms AS latencyMs, m.created_at AS createdAt
     FROM ai_chat_message m JOIN ai_chat_session s ON s.id = m.session_id
     WHERE ${whereSql}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ? OFFSET ?`,
    [...params, f.pageSize, (f.page - 1) * f.pageSize]
  );
  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ai_chat_message m JOIN ai_chat_session s ON s.id = m.session_id WHERE ${whereSql}`,
    params
  );
  return { rows, total: totalRow?.total ?? 0 };
}

/** JSONL 导出全集(忽略分页,受日期过滤约束,契约 3.19 export=1) */
export async function exportMessages(f: AiLogFilters): Promise<AiMessageRow[]> {
  const { whereSql, params } = buildFilters(f);
  return query<AiMessageRow[]>(
    `SELECT m.id, s.session_key AS sessionKey, m.role, m.content, m.sources_json AS sourcesJson,
            m.mode, m.retriever, m.latency_ms AS latencyMs, m.created_at AS createdAt
     FROM ai_chat_message m JOIN ai_chat_session s ON s.id = m.session_id
     WHERE ${whereSql}
     ORDER BY m.created_at ASC, m.id ASC`,
    params
  );
}
