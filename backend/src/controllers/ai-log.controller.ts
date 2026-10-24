import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as aiLogService from '../services/ai-log.service';
import { fileTimestamp } from '../utils/datetime';
import type { AiLogQuery } from '../validators/ai-log.schema';

/** GET /api/admin/ai-logs(契约 3.19;export=1 返回 JSONL 文件流) */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<AiLogQuery>(res, 'query');
    if (q.export === '1') {
      const rows = await aiLogService.exportRows(q);
      res.setHeader('Content-Type', 'application/jsonl; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ai-chat-export-${fileTimestamp()}.jsonl"`);
      const body = rows.map((r) => JSON.stringify(r)).join('\n');
      res.status(200).send(rows.length > 0 ? `${body}\n` : '');
      return;
    }
    ok(res, await aiLogService.list(q));
  } catch (err) {
    next(err);
  }
}
