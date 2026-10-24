import http from './http';
import type { Paged, PageQuery } from '@/types/api';
import type { ServiceDetail, ServiceItem } from '@/types/service';

export interface ServiceListQuery extends PageQuery {
  keyword?: string;
  locationId?: number;
}

/** 办事指南列表,仅 isEnabled=1(契约 2.5) */
export function getServices(params: ServiceListQuery) {
  return http.get<unknown, Paged<ServiceItem>>('/services', { params });
}

/** 办事指南详情(契约 2.6) */
export function getServiceDetail(id: number) {
  return http.get<unknown, ServiceDetail>(`/services/${id}`);
}
