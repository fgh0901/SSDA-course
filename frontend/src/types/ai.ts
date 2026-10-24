import type { SourceType } from './api';

// AI 问答(契约 2.15 / 第 4 节)
export interface AiSource {
  type: SourceType;
  id: number;
  title: string;
  /** 该条目的原始来源 */
  source?: string;
  updatedAt?: string;
}

export interface AiChatResponse {
  answer: string;
  sources: AiSource[];
  /** deepseek=LLM 生成;fallback=降级模板 */
  mode: 'deepseek' | 'fallback';
  retriever: string;
}

export interface AiChatPayload {
  /** UUID v4,前端生成并持久化(契约 4.3) */
  sessionId: string;
  /** 1~500 字符 */
  message: string;
}

// AI 对话日志(契约 3.19)
export interface AiLogItem {
  id: number;
  sessionKey: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Array<{ type: SourceType; id: number; title: string }>;
  mode?: 'deepseek' | 'fallback';
  retriever?: string;
  latencyMs?: number;
  createdAt: string;
}

export interface AiLogQuery {
  sessionKey?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
