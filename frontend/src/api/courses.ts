import http from './http';
import type { Paged, PageQuery } from '@/types/api';
import type { CourseDetail, CourseItem, TeacherDetail, TeacherItem } from '@/types/course';

export interface CourseListQuery extends PageQuery {
  keyword?: string;
  semester?: string;
}

/** 课程列表,按 name 升序(契约 2.10) */
export function getCourses(params: CourseListQuery) {
  return http.get<unknown, Paged<CourseItem>>('/courses', { params });
}

/** 课程详情:任教关系未录入返回空数组,不做推断(契约 2.11,P03) */
export function getCourseDetail(id: number) {
  return http.get<unknown, CourseDetail>(`/courses/${id}`);
}

export interface TeacherListQuery extends PageQuery {
  keyword?: string;
}

/** 教师列表:仅公开字段(契约 2.12) */
export function getTeachers(params: TeacherListQuery) {
  return http.get<unknown, Paged<TeacherItem>>('/teachers', { params });
}

/** 教师详情:含全部任教课程(契约 2.13) */
export function getTeacherDetail(id: number) {
  return http.get<unknown, TeacherDetail>(`/teachers/${id}`);
}
