import { z } from 'zod';

/** AI 对话 body(契约 2.15:sessionId 为 uuid,message 去空格后 1~500 字符) */
export const aiChatSchema = z.object({
  sessionId: z.uuid({ error: 'sessionId 必须为合法 UUID 格式' }),
  message: z
    .string({ error: 'message 不能为空' })
    .trim()
    .min(1, 'message 不能为空')
    .max(500, 'message 不能超过 500 字符')
});

export type AiChatInput = z.infer<typeof aiChatSchema>;
