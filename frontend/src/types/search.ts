import type { SourceType } from './api';

// 聚合搜索(契约 2.14)
export interface SearchHitItem {
  id: number;
  title: string;
  /** 各类型资源的摘要或一句话描述 */
  summary: string;
  updatedAt: string;
}

// 按类型分组的结果;无命中的类型不出现在 groups 中
export interface SearchGroup {
  type: SourceType;
  total: number;
  items: SearchHitItem[];
}

export interface SearchResult {
  keyword: string;
  groups: SearchGroup[];
}

export interface SearchQuery {
  keyword: string;
  /** 逗号分隔;缺省=全部六类 */
  type?: string;
  page?: number;
  pageSize?: number;
}
