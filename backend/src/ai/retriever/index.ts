import { env } from '../../config/env';
import type { KnowledgeRetriever } from './types';
import { LocalKbRetriever } from './local-kb-retriever';

/**
 * 检索器工厂:默认 LocalKbRetriever;
 * 预留 HttpKbRetriever——KB_API_BASE_URL 配置后可切换外部知识库,
 * 仅改配置不改 service 代码(Phase 3 实装)。
 */
export function createRetriever(): KnowledgeRetriever {
  if (env.KB_API_BASE_URL) {
    // Phase 3 预留位:返回 HttpKbRetriever(env.KB_API_BASE_URL);
    // 本阶段未实现外部知识库适配,继续使用本地检索器,保证功能可用。
  }
  return new LocalKbRetriever();
}
