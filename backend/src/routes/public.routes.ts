import { Router } from 'express';
import { asyncHandler } from '../utils/http';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../validators/common.schema';
import { knowledgeQuerySchema } from '../validators/knowledge.schema';
import { serviceQuerySchema } from '../validators/service.schema';
import { activityQuerySchema } from '../validators/activity.schema';
import { locationQuerySchema } from '../validators/location.schema';
import { courseQuerySchema, teacherQuerySchema } from '../validators/course.schema';
import { searchQuerySchema } from '../validators/search.schema';
import * as categoryController from '../controllers/category.controller';
import * as knowledgeController from '../controllers/knowledge.controller';
import * as serviceController from '../controllers/service.controller';
import * as activityController from '../controllers/activity.controller';
import * as locationController from '../controllers/location.controller';
import * as courseController from '../controllers/course.controller';
import * as searchController from '../controllers/search.controller';

/** 公开路由(无需登录,契约第 2 节) */
export const publicRouter = Router();

publicRouter.get('/categories', asyncHandler(categoryController.listPublic));

publicRouter.get(
  '/knowledge',
  validate(knowledgeQuerySchema, 'query'),
  asyncHandler(knowledgeController.list)
);
publicRouter.get(
  '/knowledge/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(knowledgeController.detail)
);

publicRouter.get('/services', validate(serviceQuerySchema, 'query'), asyncHandler(serviceController.listPublic));
publicRouter.get('/services/:id', validate(idParamSchema, 'params'), asyncHandler(serviceController.detailPublic));

publicRouter.get('/activities', validate(activityQuerySchema, 'query'), asyncHandler(activityController.listPublic));
publicRouter.get('/activities/:id', validate(idParamSchema, 'params'), asyncHandler(activityController.detailPublic));

publicRouter.get('/locations', validate(locationQuerySchema, 'query'), asyncHandler(locationController.listPublic));
publicRouter.get('/locations/:id', validate(idParamSchema, 'params'), asyncHandler(locationController.detail));

publicRouter.get('/courses', validate(courseQuerySchema, 'query'), asyncHandler(courseController.listCourses));
publicRouter.get('/courses/:id', validate(idParamSchema, 'params'), asyncHandler(courseController.courseDetail));

publicRouter.get('/teachers', validate(teacherQuerySchema, 'query'), asyncHandler(courseController.listTeachers));
publicRouter.get('/teachers/:id', validate(idParamSchema, 'params'), asyncHandler(courseController.teacherDetail));

publicRouter.get('/search', validate(searchQuerySchema, 'query'), asyncHandler(searchController.aggregate));
