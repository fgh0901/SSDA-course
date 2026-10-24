import * as aiLogDao from '../dao/ai-log.dao';
import type { AiLogFilters } from '../dao/ai-log.dao';
import type { AiLogQuery } from '../validators/ai-log.schema';

function parseSources(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return raw ?? [];
}

/** 管理端 AI 日志列表(契约 3.19) */
export async function list(q: AiLogQuery) {
  const filters: AiLogFilters = {
    sessionKey: q.sessionKey,
    startDate: q.startDate,
    endDate: q.endDate
  };
  const { rows, total } = await aiLogDao.listMessages({ ...filters, page: q.page, pageSize: q.pageSize });
  return {
    list: rows.map((r) => ({
      id: r.id,
      sessionKey: r.sessionKey,
      role: r.role,
      content: r.content,
      sources: parseSources(r.sourcesJson),
      mode: r.mode,
      retriever: r.retriever,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt
    })),
    total,
    page: q.page,
    pageSize: q.pageSize
  };
}

/** JSONL 导出行(契约 3.19 export=1;每行 { sessionId, role, content, sources, mode, createdAt }) */
export async function exportRows(q: AiLogQuery): Promise<Array<Record<string, unknown>>> {
  const filters: AiLogFilters = {
    sessionKey: q.sessionKey,
    startDate: q.startDate,
    endDate: q.endDate
  };
  const rows = await aiLogDao.exportMessages(filters);
  return rows.map((r) => ({
    sessionId: r.sessionKey,
    role: r.role,
    content: r.content,
    sources: parseSources(r.sourcesJson),
    mode: r.mode,
    createdAt: r.createdAt
  }));
}
