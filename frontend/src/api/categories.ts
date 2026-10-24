import http from './http';
import type { Category } from '@/types/category';

/** 启用中的分类字典,全量返回(契约 2.2,分页唯一例外) */
export function getCategories() {
  return http.get<unknown, { list: Category[] }>('/categories');
}
