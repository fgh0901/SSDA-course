import { Router } from 'express';
import { asyncHandler } from '../utils/http';
import { requireAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamSchema, paginationSchema } from '../validators/common.schema';
import { adminKnowledgeQuerySchema, expiredQuerySchema, knowledgeReviewSchema, knowledgeUpsertSchema } from '../validators/knowledge.schema';
import { loginSchema } from '../validators/auth.schema';
import { categoryUpsertSchema } from '../validators/category.schema';
import { adminServiceQuerySchema, serviceUpsertSchema } from '../validators/service.schema';
import { adminActivityQuerySchema, activityUpsertSchema } from '../validators/activity.schema';
import { locationQuerySchema, locationUpsertSchema } from '../validators/location.schema';
import { courseQuerySchema, courseTeacherParamsSchema, courseTeacherUpsertSchema, courseUpsertSchema, teacherQuerySchema, teacherUpsertSchema } from '../validators/course.schema';
import { aiLogQuerySchema } from '../validators/ai-log.schema';
import * as adminKnowledge from '../controllers/admin-knowledge.controller';
import * as categoryController from '../controllers/category.controller';
import * as serviceController from '../controllers/service.controller';
import * as activityController from '../controllers/activity.controller';
import * as locationController from '../controllers/location.controller';
import * as courseController from '../controllers/course.controller';
import * as aiLogController from '../controllers/ai-log.controller';

/** 管理路由(契约第 3 节):除 login 外全部要求 JWT + admin 角色(TC-07) */
export const adminRouter = Router();

// --- 登录(公开) ---
adminRouter.post('/auth/login', validate(loginSchema), asyncHandler(adminKnowledge.login));

// --- 其余接口统一鉴权 ---
const guarded = Router();
guarded.use(requireAdmin);
adminRouter.use(guarded);

// 知识管理(注意:expired 必须注册在 /:id 之前)
guarded.get('/knowledge', validate(adminKnowledgeQuerySchema, 'query'), asyncHandler(adminKnowledge.list));
guarded.get('/knowledge/expired', validate(expiredQuerySchema, 'query'), asyncHandler(adminKnowledge.expired));
guarded.get('/knowledge/:id', validate(idParamSchema, 'params'), asyncHandler(adminKnowledge.detail));
guarded.post('/knowledge', validate(knowledgeUpsertSchema), asyncHandler(adminKnowledge.create));
guarded.put('/knowledge/:id', validate(idParamSchema, 'params'), validate(knowledgeUpsertSchema), asyncHandler(adminKnowledge.update));
guarded.delete('/knowledge/:id', validate(idParamSchema, 'params'), asyncHandler(adminKnowledge.remove));
guarded.post('/knowledge/:id/submit-review', validate(idParamSchema, 'params'), asyncHandler(adminKnowledge.submitReview));
guarded.post('/knowledge/:id/review', validate(idParamSchema, 'params'), validate(knowledgeReviewSchema), asyncHandler(adminKnowledge.review));
guarded.post('/knowledge/:id/takedown', validate(idParamSchema, 'params'), asyncHandler(adminKnowledge.takedown));
guarded.get(
  '/knowledge/:id/change-logs',
  validate(idParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  asyncHandler(adminKnowledge.changeLogs)
);

// 分类管理
guarded.get('/categories', asyncHandler(categoryController.listAdmin));
guarded.post('/categories', validate(categoryUpsertSchema), asyncHandler(categoryController.create));
guarded.put('/categories/:id', validate(idParamSchema, 'params'), validate(categoryUpsertSchema), asyncHandler(categoryController.update));
guarded.delete('/categories/:id', validate(idParamSchema, 'params'), asyncHandler(categoryController.remove));

// 办事指南管理
guarded.get('/services', validate(adminServiceQuerySchema, 'query'), asyncHandler(serviceController.listAdmin));
guarded.get('/services/:id', validate(idParamSchema, 'params'), asyncHandler(serviceController.detailAdmin));
guarded.post('/services', validate(serviceUpsertSchema), asyncHandler(serviceController.create));
guarded.put('/services/:id', validate(idParamSchema, 'params'), validate(serviceUpsertSchema), asyncHandler(serviceController.update));
guarded.delete('/services/:id', validate(idParamSchema, 'params'), asyncHandler(serviceController.remove));

// 活动管理
guarded.get('/activities', validate(adminActivityQuerySchema, 'query'), asyncHandler(activityController.listAdmin));
guarded.get('/activities/:id', validate(idParamSchema, 'params'), asyncHandler(activityController.detailAdmin));
guarded.post('/activities', validate(activityUpsertSchema), asyncHandler(activityController.create));
guarded.put('/activities/:id', validate(idParamSchema, 'params'), validate(activityUpsertSchema), asyncHandler(activityController.update));
guarded.delete('/activities/:id', validate(idParamSchema, 'params'), asyncHandler(activityController.remove));

// 地点管理
guarded.get('/locations', validate(locationQuerySchema, 'query'), asyncHandler(locationController.listAdmin));
guarded.post('/locations', validate(locationUpsertSchema), asyncHandler(locationController.create));
guarded.put('/locations/:id', validate(idParamSchema, 'params'), validate(locationUpsertSchema), asyncHandler(locationController.update));
guarded.delete('/locations/:id', validate(idParamSchema, 'params'), asyncHandler(locationController.remove));

// 课程管理
guarded.get('/courses', validate(courseQuerySchema, 'query'), asyncHandler(courseController.listAdmin));
guarded.get('/courses/:id', validate(idParamSchema, 'params'), asyncHandler(courseController.detailAdmin));
guarded.post('/courses', validate(courseUpsertSchema), asyncHandler(courseController.createCourse));
guarded.put('/courses/:id', validate(idParamSchema, 'params'), validate(courseUpsertSchema), asyncHandler(courseController.updateCourse));
guarded.delete('/courses/:id', validate(idParamSchema, 'params'), asyncHandler(courseController.removeCourse));

// 教师管理
guarded.get('/teachers', validate(teacherQuerySchema, 'query'), asyncHandler(courseController.listTeachersAdmin));
guarded.get('/teachers/:id', validate(idParamSchema, 'params'), asyncHandler(courseController.teacherDetailAdmin));
guarded.post('/teachers', validate(teacherUpsertSchema), asyncHandler(courseController.createTeacher));
guarded.put('/teachers/:id', validate(idParamSchema, 'params'), validate(teacherUpsertSchema), asyncHandler(courseController.updateTeacher));
guarded.delete('/teachers/:id', validate(idParamSchema, 'params'), asyncHandler(courseController.removeTeacher));

// 任教关系管理(契约 3.18)
guarded.get('/courses/:id/teachers', validate(idParamSchema, 'params'), asyncHandler(courseController.listRelations));
guarded.post('/courses/:id/teachers', validate(idParamSchema, 'params'), validate(courseTeacherUpsertSchema), asyncHandler(courseController.addRelation));
guarded.delete(
  '/courses/:id/teachers/:relationId',
  validate(courseTeacherParamsSchema, 'params'),
  asyncHandler(courseController.removeRelation)
);

// AI 日志(契约 3.19)
guarded.get('/ai-logs', validate(aiLogQuerySchema, 'query'), asyncHandler(aiLogController.list));
