import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as aiChatService from '../ai/chat-service';
import type { AiChatInput } from '../validators/ai.schema';

/** POST /api/ai/chat(契约 2.15;降级模式全链路) */
export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<AiChatInput>(res, 'body');
    ok(res, await aiChatService.chat(input.sessionId, input.message));
  } catch (err) {
    next(err);
  }
}
