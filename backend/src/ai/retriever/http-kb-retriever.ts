import { env } from '../../config/env';
import type { KnowledgeRetriever, RetrievedSource, RetrieverResult } from './types';

interface KbItem {
  id?: number;
  title?: string;
  snippet?: string;
  source?: string;
  updatedAt?: string;
}

/**
 * 外部知识库检索器(方式 A:HTTP 检索接口)。
 * 对接约定见 docs/design/06-知识库对接说明.md:
 * POST {KB_API_BASE_URL}/retrieve {question, topK} → {items:[{id,title,snippet,source,updatedAt}]}
 * 超时/非 2xx/报文异常一律抛错,由工厂级联回本地检索器(鲁棒性:外部库宕机不影响主流程)。
 */
export class HttpKbRetriever implements KnowledgeRetriever {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, token?: string, timeoutMs = 5000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
    this.timeoutMs = timeoutMs;
  }

  async retrieve(question: string): Promise<RetrieverResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify({ question, topK: 5 }),
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`外部知识库 HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { items?: KbItem[] };
      const items: RetrievedSource[] = (payload.items || [])
        .filter((it) => it && typeof it.title === 'string')
        .slice(0, 5)
        .map((it, i) => ({
          type: 'knowledge' as const,
          id: typeof it.id === 'number' ? it.id : 0,
          title: it.title as string,
          snippet: (it.snippet || '').slice(0, 200),
          source: it.source || '外部知识库',
          updatedAt: it.updatedAt || '',
          score: 1 - i * 0.1 // 按外部库返回顺序赋予递减分
        }));
      return { items, isReliable: items.length > 0, retriever: 'http_kb' };
    } finally {
      clearTimeout(timer);
    }
  }
}
