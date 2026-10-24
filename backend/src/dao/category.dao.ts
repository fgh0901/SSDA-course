import { execute, insert, query, queryOne, type Exec } from '../config/db';

export interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  isEnabled: number;
  knowledgeCount?: number;
}

/** 启用中的分类字典(契约 2.2,按 sortOrder 升序) */
export async function findAllEnabled(): Promise<CategoryRow[]> {
  return query<CategoryRow[]>(
    `SELECT id, name, description, sort_order AS sortOrder, is_enabled AS isEnabled
     FROM knowledge_category WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC`
  );
}

/** 管理端全量分类,含关联知识数(契约 3.12) */
export async function findAllWithKnowledgeCount(): Promise<CategoryRow[]> {
  return query<CategoryRow[]>(
    `SELECT c.id, c.name, c.description, c.sort_order AS sortOrder, c.is_enabled AS isEnabled,
            COUNT(k.id) AS knowledgeCount
     FROM knowledge_category c
     LEFT JOIN knowledge k ON k.category_id = c.id
     GROUP BY c.id, c.name, c.description, c.sort_order, c.is_enabled
     ORDER BY c.sort_order ASC, c.id ASC`
  );
}

export async function findById(id: number, exec?: Exec): Promise<CategoryRow | null> {
  return queryOne<CategoryRow>(
    `SELECT id, name, description, sort_order AS sortOrder, is_enabled AS isEnabled
     FROM knowledge_category WHERE id = ?`,
    [id],
    exec
  );
}

export async function findByName(name: string, excludeId?: number): Promise<CategoryRow | null> {
  if (excludeId !== undefined) {
    return queryOne<CategoryRow>(
      'SELECT id, name FROM knowledge_category WHERE name = ? AND id <> ?',
      [name, excludeId]
    );
  }
  return queryOne<CategoryRow>('SELECT id, name FROM knowledge_category WHERE name = ?', [name]);
}

/** 分类下知识条数(删除保护用) */
export async function countKnowledge(categoryId: number): Promise<number> {
  const row = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM knowledge WHERE category_id = ?',
    [categoryId]
  );
  return row?.total ?? 0;
}

export async function insertCategory(data: {
  name: string;
  description?: string;
  sortOrder: number;
  isEnabled: number;
}, exec?: Exec): Promise<number> {
  return insert(
    'INSERT INTO knowledge_category (name, description, sort_order, is_enabled) VALUES (?, ?, ?, ?)',
    [data.name, data.description ?? null, data.sortOrder, data.isEnabled],
    exec
  );
}

export async function updateCategory(id: number, data: {
  name: string;
  description?: string;
  sortOrder: number;
  isEnabled: number;
}, exec?: Exec): Promise<number> {
  return execute(
    'UPDATE knowledge_category SET name = ?, description = ?, sort_order = ?, is_enabled = ? WHERE id = ?',
    [data.name, data.description ?? null, data.sortOrder, data.isEnabled, id],
    exec
  );
}

export async function removeCategory(id: number, exec?: Exec): Promise<number> {
  return execute('DELETE FROM knowledge_category WHERE id = ?', [id], exec);
}
