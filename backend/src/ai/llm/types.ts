/**
 * LLM 适配器接口(与 docs/design/02-ai-component-design.md 第 4 节签名一致)
 * 可替换性:实现同一接口即可切换智谱/通义(简报第 2 节)
 */
export interface LlmResult {
  answer: string;
  latencyMs: number;
}

export interface LlmMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LlmAdapter {
  /**
   * 生成回答;失败(未配置 Key/超时/网络错误/HTTP 非 2xx/返回空)抛 LlmError,
   * 由 chat-service 捕获后走降级模板。
   */
  chatCompletion(system: string, user: string): Promise<LlmResult>;
}

/** LLM 调用失败 */
export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmError';
  }
}
