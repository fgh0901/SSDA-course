import type { KnowledgeStatus } from './api';

// 知识列表项(契约 2.3,仅 published;管理端 3.2 额外含 status)
export interface KnowledgeItem {
  id: number;
  title: string;
  categoryId: number;
  categoryName: string;
  /** 正文去 HTML 前缀截取 ≤80 字 */
  summary: string;
  source: string;
  /** 1=已核实 0=待核实 */
  isVerified: 0 | 1;
  effectiveFrom?: string;
  effectiveUntil?: string;
  updatedAt: string;
  /** 管理端列表(契约 3.2)原样返回四态;学生端列表无此字段 */
  status?: KnowledgeStatus;
}

// 知识详情(契约 2.4)
export interface KnowledgeDetail {
  id: number;
  title: string;
  categoryId: number;
  categoryName: string;
  content: string;
  source: string;
  status: KnowledgeStatus;
  isVerified: 0 | 1;
  effectiveFrom?: string;
  effectiveUntil?: string;
  /** 服务端计算的过期标识,前端据此渲染过期横幅(TC-09) */
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

// 知识新增/编辑表单(契约 3.4/3.5)
export interface KnowledgePayload {
  title: string;
  categoryId: number;
  content: string;
  source: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  isVerified?: 0 | 1;
}

// 过期/临期工作台列表项(契约 3.10)
export interface ExpiredKnowledgeItem {
  id: number;
  title: string;
  status: KnowledgeStatus;
  effectiveUntil: string;
  /** expired=已过期 expiring=临期 */
  state: 'expired' | 'expiring';
  /** 已过期天数(state=expired 时返回) */
  daysOverdue?: number;
  updatedAt: string;
}

// 知识修改日志(契约 3.11)
export interface KnowledgeChangeLog {
  id: number;
  knowledgeId: number;
  adminId: number;
  adminUsername: string;
  /** create/update/delete/submit_review/review_publish/review_reject/takedown */
  action: string;
  detail: string;
  createdAt: string;
}
