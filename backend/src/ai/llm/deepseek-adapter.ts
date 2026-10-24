import { env } from '../../config/env';
import type { LlmAdapter, LlmResult } from './types';
import { LlmError } from './types';

/** OpenAI 兼容 /chat/completions 响应中本适配器关心的最小结构(其余字段不依赖) */
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

/**
 * DeepSeek 适配器(Phase 3 实装,OpenAI 兼容协议,02-ai-component-design 第 3.2/4 节):
 *   POST {DEEPSEEK_BASE_URL|https://api.deepseek.com}/chat/completions
 *   headers: Authorization: Bearer ${DEEPSEEK_API_KEY}、Content-Type: application/json
 *   body: { model: DEEPSEEK_MODEL('deepseek-chat'), messages: [system, user],
 *           temperature: 0.3, max_tokens: 600, stream: false }
 *   AbortController 超时 LLM_TIMEOUT_MS(默认 20s),超时按失败处理;
 *   HTTP 非 2xx / 网络错误 / 空内容 / JSON 结构异常 → 统一抛 LlmError,由 chat-service 降级。
 * DEEPSEEK_API_KEY 只在服务端使用,不进日志、不进提示词存档。
 */
export class DeepSeekAdapter implements LlmAdapter {
  constructor(
    private apiKey: string = env.DEEPSEEK_API_KEY ?? '',
    private baseUrl: string = env.DEEPSEEK_BASE_URL,
    private timeoutMs: number = env.LLM_TIMEOUT_MS
  ) {}

  async chatCompletion(system: string, user: string): Promise<LlmResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: env.DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.3,
          max_tokens: 600,
          stream: false
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new LlmError(`DeepSeek HTTP 状态非 2xx:${res.status}`);
      }

      const data = (await res.json()) as ChatCompletionResponse;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim() === '') {
        throw new LlmError('DeepSeek 返回空内容或 JSON 结构异常(无 choices[0].message.content)');
      }
      return { answer: content, latencyMs: Date.now() - startedAt };
    } catch (err) {
      if (err instanceof LlmError) {
        throw err;
      }
      // 超时:AbortController 触发后 fetch 以 AbortError 拒绝;按失败处理由 ChatService 降级
      if (controller.signal.aborted) {
        throw new LlmError(`DeepSeek 请求超时(${this.timeoutMs}ms)`);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new LlmError(`DeepSeek 调用失败:${message}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
