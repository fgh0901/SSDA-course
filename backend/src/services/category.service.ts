import * as categoryDao from '../dao/category.dao';
import { HttpError } from '../utils/http';
import type { CategoryUpsert } from '../validators/category.schema';

/** 启用中的分类字典(契约 2.2,全量例外不分页) */
export async function listPublic() {
  return { list: await categoryDao.findAllEnabled() };
}

/** 管理端全量分类,含知识数(契约 3.12) */
export async function listAdmin() {
  return { list: await categoryDao.findAllWithKnowledgeCount() };
}

export async function create(input: CategoryUpsert): Promise<{ id: number }> {
  const dup = await categoryDao.findByName(input.name);
  if (dup) throw new HttpError(400, 'VALIDATION_ERROR', '分类名称已存在');
  const id = await categoryDao.insertCategory({
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder,
    isEnabled: input.isEnabled
  });
  return { id };
}

export async function update(id: number, input: CategoryUpsert): Promise<void> {
  const exists = await categoryDao.findById(id);
  if (!exists) throw new HttpError(404, 'NOT_FOUND', '分类不存在');
  const dup = await categoryDao.findByName(input.name, id);
  if (dup) throw new HttpError(400, 'VALIDATION_ERROR', '分类名称已存在');
  await categoryDao.updateCategory(id, {
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder,
    isEnabled: input.isEnabled
  });
}

/** 删除保护:分类下仍有知识 → 409(契约 3.12) */
export async function remove(id: number): Promise<{ id: number }> {
  const exists = await categoryDao.findById(id);
  if (!exists) throw new HttpError(404, 'NOT_FOUND', '分类不存在');
  const count = await categoryDao.countKnowledge(id);
  if (count > 0) {
    throw new HttpError(409, 'CONFLICT', `该分类下仍有 ${count} 条知识,请先迁移或删除`);
  }
  await categoryDao.removeCategory(id);
  return { id };
}
