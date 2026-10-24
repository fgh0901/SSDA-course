import { env } from '../../config/env';
import { DeepSeekAdapter } from './deepseek-adapter';
import type { LlmAdapter, LlmResult } from './types';
import { LlmError } from './types';

export { LlmError } from './types';
export type { LlmAdapter, LlmResult } from './types';

/** 未配置 DEEPSEEK_API_KEY 时的占位适配器:调用即抛 LlmUnavailable,service 捕获后降级 */
class NullLlmAdapter implements LlmAdapter {
  async chatCompletion(): Promise<LlmResult> {
    throw new LlmError('DEEPSEEK_API_KEY 未配置,LLM 生成不可用');
  }
}

/** LLM 工厂:按 Key 是否配置与 LLM_PROVIDER 选择适配器(当前 provider 仅 deepseek) */
export function createLlmAdapter(): LlmAdapter {
  if (!env.DEEPSEEK_API_KEY) {
    return new NullLlmAdapter();
  }
  // Phase 3 实装 HTTP 调用;当前 DeepSeekAdapter.chatCompletion 抛错,同样走降级
  return new DeepSeekAdapter();
}
