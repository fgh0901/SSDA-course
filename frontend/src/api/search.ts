import http from './http';
import type { SearchResult, SearchQuery } from '@/types/search';

/** 聚合搜索:同时检索六类资源,按类型分组返回(契约 2.14) */
export function searchAll(params: SearchQuery) {
  return http.get<unknown, SearchResult>('/search', { params });
}
