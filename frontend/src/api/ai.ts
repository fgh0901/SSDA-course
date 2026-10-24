import http from './http';
import type { Paged } from '@/types/api';
import type { AiChatPayload, AiChatResponse, AiLogItem, AiLogQuery } from '@/types/ai';

/** AI 问答:匿名 sessionId,不收集任何个人身份信息(契约 2.15) */
export function aiChat(payload: AiChatPayload) {
  return http.post<unknown, AiChatResponse>('/ai/chat', payload);
}

/** 生成并持久化匿名会话 id(契约 4.3):首次进入 AI 页面时调用 */
export function ensureAiSessionId(): string {
  let sessionId = localStorage.getItem('ssda_ai_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('ssda_ai_session_id', sessionId);
  }
  return sessionId;
}

/** 管理端 AI 对话记录分页查询(契约 3.19) */
export function getAdminAiLogs(params: AiLogQuery) {
  return http.get<unknown, Paged<AiLogItem>>('/admin/ai-logs', { params });
}

/**
 * 导出 AI 对话记录 JSONL(契约 3.19 ?export=1)。
 * 注:该接口为 JWT 保护,window.open 无法携带 Authorization 头,
 * 故用带 token 的 blob 请求下载,URL 参数与契约一致(已在 worklog 登记该偏差)。
 * 注意:响应拦截器对 blob 不解包,返回值即 Blob 本身(D-MED-3:此前误取 resp.data 导致导出必然失败)。
 */
export async function exportAiLogs(params: Pick<AiLogQuery, 'startDate' | 'endDate'>): Promise<void> {
  const blob = await http.get<unknown, Blob>('/admin/ai-logs', {
    params: { ...params, export: 1 },
    responseType: 'blob'
  });
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('导出内容为空,请稍后重试');
  }
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-chat-export-${stamp}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
}
