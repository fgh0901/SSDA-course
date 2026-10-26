import { env } from '../../config/env';
import type { KnowledgeRetriever } from './types';
import { LocalKbRetriever } from './local-kb-retriever';
import { HttpKbRetriever } from './http-kb-retriever';

/**
 * 检索器工厂与级联策略:
 * - 未配置 KB_API_BASE_URL → 本地检索器(演示/降级模式);
 * - 已配置 → 外部知识库优先(HTTP),失败自动级联回本地检索器(记警告日志),
 *   保证外部库宕机/升级期间学生端 AI 问答不中断(鲁棒性设计)。
 * 仅改配置即可切换检索源,service 层代码零改动(简报第 2 节)。
 */
export function createRetriever(): KnowledgeRetriever {
  if (!env.KB_API_BASE_URL) {
    return new LocalKbRetriever();
  }
  const http = new HttpKbRetriever(env.KB_API_BASE_URL, env.KB_API_TOKEN, env.KB_TIMEOUT_MS);
  const local = new LocalKbRetriever();
  return {
    async retrieve(question: string) {
      try {
        return await http.retrieve(question);
      } catch (err) {
        console.warn(
          `[retriever] 外部知识库不可用,级联回本地检索:${err instanceof Error ? err.message : String(err)}`
        );
        return local.retrieve(question);
      }
    }
  };
}
