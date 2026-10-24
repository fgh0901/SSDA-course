import http from './http';
import type { Paged, PageQuery } from '@/types/api';
import type { ActivityDetail, ActivityItem } from '@/types/activity';

export interface ActivityListQuery extends PageQuery {
  keyword?: string;
  /** upcoming=未开始 past=已结束 缺省=全部(契约 2.7) */
  time?: 'upcoming' | 'past';
}

/** 活动列表,仅 isEnabled=1,按 startTime 倒序(契约 2.7) */
export function getActivities(params: ActivityListQuery) {
  return http.get<unknown, Paged<ActivityItem>>('/activities', { params });
}

/** 活动详情(契约 2.8) */
export function getActivityDetail(id: number) {
  return http.get<unknown, ActivityDetail>(`/activities/${id}`);
}
