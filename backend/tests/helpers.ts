import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import request from 'supertest';
import { execute, insert } from '../src/config/db';

/** 测试数据统一前缀,便于按前缀清理 */
export const MARK = 'TCK-';

/** 相对今天偏移 n 天的日期字符串(YYYY-MM-DD,东八区) */
export function dateOffset(days: number): string {
  return new Date(Date.now() + days * 86400000).toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Shanghai'
  });
}

/** 相对今天偏移 n 天的日期时间(YYYY-MM-DD HH:mm:ss) */
export function dateTimeOffset(days: number, hour = 10): string {
  return `${dateOffset(days)} ${String(hour).padStart(2, '0')}:00:00`;
}

/** 创建测试管理员(密码随机哈希,不用 seed 凭据) */
export async function createAdmin(username: string, password = 'test-pass-123'): Promise<void> {
  await execute(
    "INSERT INTO admin_user (username, password_hash, role) VALUES (?, ?, 'admin')",
    [username, bcrypt.hashSync(password, 4), 'admin']
  );
}

/** 走登录接口取 token(TC-07 链路口径) */
export async function login(app: Express, username: string, password: string): Promise<string> {
  const res = await request(app).post('/api/admin/auth/login').send({ username, password });
  if (res.status !== 200) {
    throw new Error(`测试登录失败:${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token as string;
}

/** 直接插入知识条目,返回 id */
export async function insertKnowledge(row: {
  categoryId: number;
  title: string;
  content: string;
  source?: string;
  status?: string;
  isVerified?: number;
  effectiveFrom: string;
  effectiveUntil?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO knowledge (category_id, title, content, source, status, is_verified, effective_from, effective_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.categoryId,
      row.title,
      row.content,
      row.source ?? '测试来源(自动化用例)',
      row.status ?? 'published',
      row.isVerified ?? 1,
      row.effectiveFrom,
      row.effectiveUntil ?? null
    ]
  );
}

export async function insertCategory(name: string, sortOrder = 0, isEnabled = 1): Promise<number> {
  const id = await insert(
    'INSERT INTO knowledge_category (name, description, sort_order, is_enabled) VALUES (?, ?, ?, ?)',
    [name, '测试分类', sortOrder, isEnabled]
  );
  return id;
}

export async function insertLocation(row: {
  name: string;
  campus?: string;
  building?: string;
  floor?: string;
  room?: string;
}): Promise<number> {
  return insert('INSERT INTO location (name, campus, building, floor, room) VALUES (?, ?, ?, ?, ?)', [
    row.name,
    row.campus ?? '主校区',
    row.building ?? null,
    row.floor ?? null,
    row.room ?? null
  ]);
}

export async function insertServiceGuide(row: {
  title: string;
  department?: string;
  locationId?: number | null;
  isEnabled?: number;
}): Promise<number> {
  return insert('INSERT INTO service_guide (title, department, location_id, is_enabled) VALUES (?, ?, ?, ?)', [
    row.title,
    row.department ?? '测试部门',
    row.locationId ?? null,
    row.isEnabled ?? 1
  ]);
}

export async function insertActivity(row: {
  title: string;
  startTime: string;
  endTime: string;
  locationId?: number | null;
  isEnabled?: number;
}): Promise<number> {
  return insert(
    'INSERT INTO campus_activity (title, start_time, end_time, location_id, is_enabled) VALUES (?, ?, ?, ?, ?)',
    [row.title, row.startTime, row.endTime, row.locationId ?? null, row.isEnabled ?? 1]
  );
}

export async function insertTeacher(row: { name: string; title?: string }): Promise<number> {
  return insert('INSERT INTO teacher (name, title) VALUES (?, ?)', [row.name, row.title ?? '讲师']);
}

export async function insertCourse(row: { name: string; code: string; semester?: string }): Promise<number> {
  return insert('INSERT INTO course (name, code, semester) VALUES (?, ?, ?)', [
    row.name,
    row.code,
    row.semester ?? '2026-2027-1'
  ]);
}

export async function insertRelation(
  courseId: number,
  teacherId: number,
  locationId?: number | null,
  schedule?: string
): Promise<number> {
  return insert('INSERT INTO course_teacher (course_id, teacher_id, location_id, schedule) VALUES (?, ?, ?, ?)', [
    courseId,
    teacherId,
    locationId ?? null,
    schedule ?? null
  ]);
}

/** 按标记前缀清理各表(子表先行,避免外键残留) */
export async function cleanupByMark(): Promise<void> {
  await execute('DELETE m FROM ai_chat_message m JOIN ai_chat_session s ON s.id = m.session_id WHERE s.session_key LIKE ?', [
    `${MARK}%`
  ]);
  await execute('DELETE FROM ai_chat_session WHERE session_key LIKE ?', [`${MARK}%`]);
  await execute('DELETE FROM knowledge_change_log WHERE knowledge_id IN (SELECT id FROM knowledge WHERE title LIKE ?)', [
    `${MARK}%`
  ]);
  await execute('DELETE FROM course_teacher WHERE course_id IN (SELECT id FROM course WHERE name LIKE ? OR code LIKE ?)', [
    `${MARK}%`,
    `${MARK}%`
  ]);
  await execute('DELETE FROM course_teacher WHERE teacher_id IN (SELECT id FROM teacher WHERE name LIKE ?)', [`${MARK}%`]);
  await execute('DELETE FROM knowledge WHERE title LIKE ?', [`${MARK}%`]);
  await execute('DELETE FROM service_guide WHERE title LIKE ?', [`${MARK}%`]);
  await execute('DELETE FROM campus_activity WHERE title LIKE ?', [`${MARK}%`]);
  await execute('DELETE FROM course WHERE name LIKE ? OR code LIKE ?', [`${MARK}%`, `${MARK}%`]);
  await execute('DELETE FROM teacher WHERE name LIKE ?', [`${MARK}%`]);
  await execute('DELETE FROM location WHERE name LIKE ?', [`${MARK}%`]);
  await execute('DELETE FROM knowledge_category WHERE name LIKE ?', [`${MARK}%`]);
  await execute('DELETE FROM admin_user WHERE username LIKE ?', [`${MARK}%`]);
}
