import http from './http';
import type { Paged, PageQuery } from '@/types/api';
import type { KnowledgeDetail, KnowledgeItem } from '@/types/knowledge';

export interface KnowledgeListQuery extends PageQuery {
  keyword?: string;
  categoryId?: number;
}

/** 学生端知识列表:仅返回 published(契约 2.3) */
export function getKnowledgeList(params: KnowledgeListQuery) {
  return http.get<unknown, Paged<KnowledgeItem>>('/knowledge', { params });
}

/** 学生端知识详情:仅 published 可见,其余 404(契约 2.4) */
export function getKnowledgeDetail(id: number) {
  return http.get<unknown, KnowledgeDetail>(`/knowledge/${id}`);
}
