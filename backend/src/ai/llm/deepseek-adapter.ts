import { env } from '../../config/env';
import type { LlmAdapter, LlmResult } from './types';
import { LlmError } from './types';

/**
 * DeepSeek 适配器(Phase 2 预留:仅接口与配置占位,不实现 HTTP 调用)。
 *
 * Phase 3 计划(届时只补充本类实现,不影响其他模块):
 *   POST {env.DEEPSEEK_BASE_URL|https://api.deepseek.com}/chat/completions
 *   headers: { Authorization: Bearer ${env.DEEPSEEK_API_KEY} }
 *   body: {
 *     model: env.DEEPSEEK_MODEL ('deepseek-chat'),
 *     temperature: 0.3, max_tokens: 600, stream: false,
 *     messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
 *   }
 *   AbortController 超时 env.LLM_TIMEOUT_MS(默认 20s);
 *   非 2xx / 无 choices → 抛 LlmError。
 */
export class DeepSeekAdapter implements LlmAdapter {
  constructor(
    private apiKey: string = env.DEEPSEEK_API_KEY ?? '',
    private baseUrl: string = env.DEEPSEEK_BASE_URL,
    private timeoutMs: number = env.LLM_TIMEOUT_MS
  ) {}

  async chatCompletion(_system: string, _user: string): Promise<LlmResult> {
    // Phase 2 未实现 HTTP 调用:统一抛错,由 chat-service 降级到本地模板回答
    void this.apiKey;
    void this.baseUrl;
    void this.timeoutMs;
    throw new LlmError('DeepSeek 适配器尚未启用,将在 Phase 3 接入 HTTP 调用');
  }
}
