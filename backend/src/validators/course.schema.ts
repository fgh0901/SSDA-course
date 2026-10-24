import { z } from 'zod';
import { idParamSchema, keywordSchema, paginationSchema } from './common.schema';

export const courseQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  semester: z.string().trim().max(20, 'semester 最长 20 字符').optional()
});

export const courseUpsertSchema = z.object({
  name: z.string({ error: '课程名称不能为空' }).trim().min(1, '课程名称不能为空').max(100, '课程名称最长 100 字符'),
  code: z.string({ error: '课程代码不能为空' }).trim().min(1, '课程代码不能为空').max(20, '课程代码最长 20 字符'),
  semester: z.string().trim().max(20, '学期最长 20 字符').optional(),
  description: z.string().trim().max(500, '课程简介最长 500 字符').optional()
});

/**
 * 教师表单(契约 3.17):仅允许公开字段(姓名/职称/办公室/答疑时间),
 * strictObject 拒绝电话/工号等多余字段(400)。
 */
export const teacherUpsertSchema = z.strictObject({
  name: z.string({ error: '教师姓名不能为空' }).trim().min(1, '教师姓名不能为空').max(50, '教师姓名最长 50 字符'),
  title: z.string().trim().max(50, '职称最长 50 字符').optional(),
  officeLocationId: z.coerce.number({ error: 'officeLocationId 必须为数字' }).int().positive('officeLocationId 必须为正整数').optional(),
  officeHours: z.string().trim().max(100, '答疑时间最长 100 字符').optional()
});

export const teacherQuerySchema = paginationSchema.extend({
  keyword: keywordSchema
});

export const courseTeacherUpsertSchema = z.object({
  teacherId: z.coerce.number({ error: 'teacherId 必须为数字' }).int().positive('teacherId 必须为正整数'),
  locationId: z.coerce.number({ error: 'locationId 必须为数字' }).int().positive('locationId 必须为正整数').optional(),
  schedule: z.string().trim().max(100, '上课时间最长 100 字符').optional()
});

/** 任教关系路径参数(契约 3.18;id 复用公共中文文案,体检修复 F4) */
export const courseTeacherParamsSchema = z.object({
  id: idParamSchema.shape.id,
  relationId: z.coerce
    .number({ error: 'relationId 必须为数字' })
    .int('relationId 必须为整数')
    .positive('relationId 必须为正整数')
});

export type CourseQuery = z.infer<typeof courseQuerySchema>;
export type CourseUpsert = z.infer<typeof courseUpsertSchema>;
export type TeacherUpsert = z.infer<typeof teacherUpsertSchema>;
export type TeacherQuery = z.infer<typeof teacherQuerySchema>;
export type CourseTeacherUpsert = z.infer<typeof courseTeacherUpsertSchema>;
export type CourseTeacherParams = z.infer<typeof courseTeacherParamsSchema>;
