/**
 * KnowledgeRetriever 接口定义(与 docs/design/02-ai-component-design.md 第 2 节一致)
 */
export type SourceType = 'knowledge' | 'service' | 'activity' | 'course' | 'teacher' | 'location';

export interface RetrievedSource {
  type: SourceType;
  id: number;
  title: string;
  snippet: string; // 命中片段或摘要,≤120 字
  source: string; // 原始来源(知识条目 source 必填;指南取 department 等)
  updatedAt: string; // 'YYYY-MM-DD HH:mm:ss'
  score: number; // 相关度得分,用于排序与阈值过滤
}

export interface RetrieverResult {
  items: RetrievedSource[]; // 已收敛的 top-K(默认 K=5)
  isReliable: boolean; // 是否存在可信内容(score ≥ 阈值且 items 非空)
  retriever: 'local_kb' | 'http_kb';
}

export interface KnowledgeRetriever {
  retrieve(question: string): Promise<RetrieverResult>;
}
