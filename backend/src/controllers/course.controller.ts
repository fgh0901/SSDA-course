import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ok } from '../utils/http';
import { validated } from '../middlewares/validate';
import * as courseService from '../services/course.service';
import * as teacherService from '../services/teacher.service';
import type {
  CourseQuery,
  CourseTeacherUpsert,
  CourseUpsert,
  TeacherQuery,
  TeacherUpsert
} from '../validators/course.schema';
import { idParamSchema } from '../validators/common.schema';

// ---------------- 课程 ----------------

/** GET /api/courses(契约 2.10) */
export async function listCourses(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<CourseQuery>(res, 'query');
    ok(res, await courseService.listPublic(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/courses/:id(契约 2.11) */
export async function courseDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await courseService.detailPublic(id));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/courses(契约 3.16) */
export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<CourseQuery>(res, 'query');
    ok(res, await courseService.listAdmin(q));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/courses/:id(编辑回显) */
export async function detailAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await courseService.detailAdmin(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/courses(契约 3.16) */
export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<CourseUpsert>(res, 'body');
    ok(res, await courseService.create(input));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/courses/:id(契约 3.16) */
export async function updateCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<CourseUpsert>(res, 'body');
    await courseService.update(id, input);
    ok(res, { id });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/courses/:id(契约 3.16,有任教关系 409) */
export async function removeCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await courseService.remove(id));
  } catch (err) {
    next(err);
  }
}

// ---------------- 教师 ----------------

/** GET /api/teachers(契约 2.12) */
export async function listTeachers(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<TeacherQuery>(res, 'query');
    ok(res, await teacherService.listPublic({ keyword: q.keyword, page: q.page, pageSize: q.pageSize }));
  } catch (err) {
    next(err);
  }
}

/** GET /api/teachers/:id(契约 2.13) */
export async function teacherDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await teacherService.detailPublic(id));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/teachers(契约 3.17) */
export async function listTeachersAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const q = validated<TeacherQuery>(res, 'query');
    ok(res, await teacherService.listAdmin({ keyword: q.keyword, page: q.page, pageSize: q.pageSize }));
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/teachers/:id(编辑回显) */
export async function teacherDetailAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await teacherService.detailAdmin(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/teachers(契约 3.17,strict 拒绝隐私字段) */
export async function createTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validated<TeacherUpsert>(res, 'body');
    ok(res, await teacherService.create(input));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/teachers/:id(契约 3.17) */
export async function updateTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<TeacherUpsert>(res, 'body');
    await teacherService.update(id, input);
    ok(res, { id });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/teachers/:id(契约 3.17,有任教关系 409) */
export async function removeTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await teacherService.remove(id));
  } catch (err) {
    next(err);
  }
}

// ---------------- 任教关系 ----------------

/** GET /api/admin/courses/:id/teachers(契约 3.18) */
export async function listRelations(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await courseService.listRelations(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/courses/:id/teachers(契约 3.18,重复 409) */
export async function addRelation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = validated<CourseTeacherUpsert>(res, 'body');
    ok(res, await courseService.addRelation(id, input));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/courses/:id/teachers/:relationId(契约 3.18) */
export async function removeRelation(req: Request, res: Response, next: NextFunction) {
  try {
    const params = z.object({
      id: z.coerce.number().int().positive(),
      relationId: z.coerce.number().int().positive('relationId 必须为正整数')
    }).parse(req.params);
    ok(res, await courseService.removeRelation(params.id, params.relationId));
  } catch (err) {
    next(err);
  }
}
