import { Router } from 'express';
import { asyncHandler } from '../utils/http';
import { validate } from '../middlewares/validate';
import { aiChatSchema } from '../validators/ai.schema';
import * as aiController from '../controllers/ai.controller';

/** AI 对话路由(契约 2.15:公开,匿名 sessionId) */
export const aiRouter = Router();

aiRouter.post('/chat', validate(aiChatSchema), asyncHandler(aiController.chat));
