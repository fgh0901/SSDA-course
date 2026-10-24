import http from './http';
import type { Paged, PageQuery } from '@/types/api';
import type { LocationItem } from '@/types/location';

export interface LocationListQuery extends PageQuery {
  keyword?: string;
  campus?: string;
  building?: string;
  floor?: string;
}

/** 地点查询:校区/建筑/楼层/名称组合筛选(契约 2.9) */
export function getLocations(params: LocationListQuery) {
  return http.get<unknown, Paged<LocationItem>>('/locations', { params });
}
