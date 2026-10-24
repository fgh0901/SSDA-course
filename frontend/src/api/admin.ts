import http from './http';
import type { Paged, KnowledgeStatus, PageQuery } from '@/types/api';
import type { AdminCategory, Category } from '@/types/category';
import type {
  ExpiredKnowledgeItem,
  KnowledgeChangeLog,
  KnowledgeDetail,
  KnowledgeItem,
  KnowledgePayload
} from '@/types/knowledge';
import type { ServiceDetail, ServiceItem, ServicePayload } from '@/types/service';
import type { ActivityDetail, ActivityItem, ActivityPayload } from '@/types/activity';
import type { LocationItem, LocationPayload } from '@/types/location';
import type { AdminCourseTeacherRel, CourseItem, CoursePayload, CourseTeacherPayload, TeacherItem, TeacherPayload } from '@/types/course';
import type { LoginPayload, LoginResponse } from '@/types/admin';

// ---------- 登录(契约 3.1) ----------

export function adminLogin(payload: LoginPayload) {
  return http.post<unknown, LoginResponse>('/admin/auth/login', payload);
}

// ---------- 知识管理(契约 3.2~3.11) ----------

export interface AdminKnowledgeQuery extends PageQuery {
  keyword?: string;
  categoryId?: number;
  /** 支持多值逗号分隔,缺省返回全部状态 */
  status?: string;
  isVerified?: 0 | 1;
}

/** 管理端知识列表:支持任意状态筛选,缺省全部(契约 3.2) */
export function getAdminKnowledge(params: AdminKnowledgeQuery) {
  return http.get<unknown, Paged<KnowledgeItem>>('/admin/knowledge', { params });
}

/** 单条知识详情,供编辑表单回显(契约 3.3) */
export function getAdminKnowledgeDetail(id: number) {
  return http.get<unknown, KnowledgeDetail>(`/admin/knowledge/${id}`);
}

/** 新增知识,初始状态 draft(契约 3.4) */
export function createKnowledge(payload: KnowledgePayload) {
  return http.post<unknown, { id: number; status: KnowledgeStatus }>('/admin/knowledge', payload);
}

/** 编辑知识:published/takedown 保存后自动回退 draft(契约 3.5) */
export function updateKnowledge(id: number, payload: KnowledgePayload) {
  return http.put<unknown, { id: number; status: KnowledgeStatus }>(`/admin/knowledge/${id}`, payload);
}

/** 删除知识:仅 draft 可删,其余 409(契约 3.6) */
export function deleteKnowledge(id: number) {
  return http.delete<unknown, { id: number }>(`/admin/knowledge/${id}`);
}

/** 提交审核:draft|takedown → pending_review(契约 3.7) */
export function submitReview(id: number) {
  return http.post<unknown, { id: number; status: KnowledgeStatus }>(`/admin/knowledge/${id}/submit-review`);
}

/** 审核动作:publish=通过 / reject=驳回(comment 必填)(契约 3.8) */
export function reviewKnowledge(id: number, action: 'publish' | 'reject', comment?: string) {
  return http.post<unknown, { id: number; status: KnowledgeStatus }>(`/admin/knowledge/${id}/review`, { action, comment });
}

/** 下架:published → takedown(契约 3.9) */
export function takedownKnowledge(id: number) {
  return http.post<unknown, { id: number; status: KnowledgeStatus }>(`/admin/knowledge/${id}/takedown`);
}

export interface ExpiredQuery extends PageQuery {
  /** expired / expiring / 缺省=两者 */
  state?: 'expired' | 'expiring';
  /** 临期窗口天数,默认 7 */
  days?: number;
}

/** 过期/临期工作台(契约 3.10) */
export function getExpiredKnowledge(params: ExpiredQuery) {
  return http.get<unknown, Paged<ExpiredKnowledgeItem>>('/admin/knowledge/expired', { params });
}

/** 知识修改日志,时间倒序(契约 3.11) */
export function getKnowledgeChangeLogs(id: number, params: PageQuery) {
  return http.get<unknown, Paged<KnowledgeChangeLog>>(`/admin/knowledge/${id}/change-logs`, { params });
}

// ---------- 分类管理(契约 3.12) ----------

export function getAdminCategories() {
  return http.get<unknown, { list: AdminCategory[] }>('/admin/categories');
}

export interface CategoryPayload {
  name: string;
  description?: string;
  sortOrder?: number;
  isEnabled?: 0 | 1;
}

export function createCategory(payload: CategoryPayload) {
  return http.post<unknown, { id: number }>('/admin/categories', payload);
}

export function updateCategory(id: number, payload: CategoryPayload) {
  return http.put<unknown, { id: number }>(`/admin/categories/${id}`, payload);
}

/** 仍有关联知识时 409,message 含条数(契约 3.12) */
export function deleteCategory(id: number) {
  return http.delete<unknown, { id: number }>(`/admin/categories/${id}`);
}

export function toCategoryPayload(c: Category): CategoryPayload {
  return { name: c.name, description: c.description, sortOrder: c.sortOrder, isEnabled: c.isEnabled };
}

// ---------- 办事指南管理(契约 3.13) ----------

export interface AdminServiceQuery extends PageQuery {
  keyword?: string;
  isEnabled?: 0 | 1;
}

export function getAdminServices(params: AdminServiceQuery) {
  return http.get<unknown, Paged<ServiceItem>>('/admin/services', { params });
}

export function getAdminServiceDetail(id: number) {
  return http.get<unknown, ServiceDetail>(`/admin/services/${id}`);
}

export function createService(payload: ServicePayload) {
  return http.post<unknown, { id: number }>('/admin/services', payload);
}

export function updateService(id: number, payload: ServicePayload) {
  return http.put<unknown, { id: number }>(`/admin/services/${id}`, payload);
}

export function deleteService(id: number) {
  return http.delete<unknown, { id: number }>(`/admin/services/${id}`);
}

// ---------- 活动管理(契约 3.14) ----------

export interface AdminActivityQuery extends PageQuery {
  keyword?: string;
  isEnabled?: 0 | 1;
}

export function getAdminActivities(params: AdminActivityQuery) {
  return http.get<unknown, Paged<ActivityItem>>('/admin/activities', { params });
}

export function getAdminActivityDetail(id: number) {
  return http.get<unknown, ActivityDetail>(`/admin/activities/${id}`);
}

export function createActivity(payload: ActivityPayload) {
  return http.post<unknown, { id: number }>('/admin/activities', payload);
}

export function updateActivity(id: number, payload: ActivityPayload) {
  return http.put<unknown, { id: number }>(`/admin/activities/${id}`, payload);
}

export function deleteActivity(id: number) {
  return http.delete<unknown, { id: number }>(`/admin/activities/${id}`);
}

// ---------- 地点管理(契约 3.15) ----------

export interface AdminLocationQuery extends PageQuery {
  keyword?: string;
  campus?: string;
}

export function getAdminLocations(params: AdminLocationQuery) {
  return http.get<unknown, Paged<LocationItem>>('/admin/locations', { params });
}

export function createLocation(payload: LocationPayload) {
  return http.post<unknown, { id: number }>('/admin/locations', payload);
}

export function updateLocation(id: number, payload: LocationPayload) {
  return http.put<unknown, { id: number }>(`/admin/locations/${id}`, payload);
}

/** 被任一业务引用时 409,message 含引用数量(契约 3.15) */
export function deleteLocation(id: number) {
  return http.delete<unknown, { id: number }>(`/admin/locations/${id}`);
}

// ---------- 课程管理(契约 3.16) ----------

export interface AdminCourseQuery extends PageQuery {
  keyword?: string;
  semester?: string;
}

export function getAdminCourses(params: AdminCourseQuery) {
  return http.get<unknown, Paged<CourseItem>>('/admin/courses', { params });
}

export function createCourse(payload: CoursePayload) {
  return http.post<unknown, { id: number }>('/admin/courses', payload);
}

export function updateCourse(id: number, payload: CoursePayload) {
  return http.put<unknown, { id: number }>(`/admin/courses/${id}`, payload);
}

/** 存在任教关系时 409(契约 3.16) */
export function deleteCourse(id: number) {
  return http.delete<unknown, { id: number }>(`/admin/courses/${id}`);
}

// ---------- 教师管理(契约 3.17) ----------

export interface AdminTeacherQuery extends PageQuery {
  keyword?: string;
}

export function getAdminTeachers(params: AdminTeacherQuery) {
  return http.get<unknown, Paged<TeacherItem>>('/admin/teachers', { params });
}

/** 仅允许公开字段,多余字段后端 strict() 拒绝(契约 3.17) */
export function createTeacher(payload: TeacherPayload) {
  return http.post<unknown, { id: number }>('/admin/teachers', payload);
}

export function updateTeacher(id: number, payload: TeacherPayload) {
  return http.put<unknown, { id: number }>(`/admin/teachers/${id}`, payload);
}

/** 存在任教关系时 409(契约 3.17) */
export function deleteTeacher(id: number) {
  return http.delete<unknown, { id: number }>(`/admin/teachers/${id}`);
}

// ---------- 任教关系管理(契约 3.18) ----------

export function getCourseTeacherRelations(courseId: number) {
  return http.get<unknown, { list: AdminCourseTeacherRel[] }>(`/admin/courses/${courseId}/teachers`);
}

/** 同一 (courseId, teacherId) 重复添加返回 409(契约 3.18) */
export function addCourseTeacher(courseId: number, payload: CourseTeacherPayload) {
  return http.post<unknown, { relationId: number }>(`/admin/courses/${courseId}/teachers`, payload);
}

export function removeCourseTeacher(courseId: number, relationId: number) {
  return http.delete<unknown, { relationId: number }>(`/admin/courses/${courseId}/teachers/${relationId}`);
}
