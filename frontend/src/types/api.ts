// 与 api-contract.md v1.0 全局规范一致的通用类型

/** 失败响应的错误对象(契约 1.1) */
export interface ApiError {
  /** 大写蛇形错误码,见契约 1.5 错误码表 */
  code: string;
  /** 可直接展示给用户的中文 */
  message: string;
}

/** 分页响应(契约 1.2):data = { list, total, page, pageSize } */
export interface Paged<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页请求参数(契约 1.2) */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/** 知识状态四态(契约 1.5 / 3.2) */
export type KnowledgeStatus = 'draft' | 'pending_review' | 'published' | 'takedown';

/** AI 来源与聚合搜索的资源类型(契约 2.14 / 2.15) */
export type SourceType = 'knowledge' | 'service' | 'activity' | 'course' | 'teacher' | 'location';
