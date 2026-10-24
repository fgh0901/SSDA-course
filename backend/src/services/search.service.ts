import * as knowledgeDao from '../dao/knowledge.dao';
import * as serviceDao from '../dao/service.dao';
import * as activityDao from '../dao/activity.dao';
import * as courseDao from '../dao/course.dao';
import * as teacherDao from '../dao/teacher.dao';
import * as locationDao from '../dao/location.dao';
import { summarize } from '../utils/text';

export type SearchType = 'knowledge' | 'service' | 'activity' | 'course' | 'teacher' | 'location';

export interface SearchGroup {
  type: SearchType;
  total: number;
  items: Array<{ id: number; title: string; summary: string; updatedAt: string }>;
}

interface PagedQuery {
  keyword: string;
  page: number;
  pageSize: number;
}

const ALL_TYPES: SearchType[] = ['knowledge', 'service', 'activity', 'course', 'teacher', 'location'];

/**
 * 聚合搜索(契约 2.14):六类资源并行查询,结果按类型分组;
 * 无命中类型不出现在 groups 中(TC-03)
 */
export async function aggregate(keyword: string, types: SearchType[] | undefined, page: number, pageSize: number): Promise<{
  keyword: string;
  groups: SearchGroup[];
}> {
  const targets = types && types.length > 0 ? ALL_TYPES.filter((t) => types.includes(t)) : ALL_TYPES;
  const q: PagedQuery = { keyword, page, pageSize };
  const results = await Promise.all(targets.map((type) => searchOne(type, q)));
  return { keyword, groups: results.filter((g) => g.total > 0) };
}

async function searchOne(type: SearchType, q: PagedQuery): Promise<SearchGroup> {
  switch (type) {
    case 'knowledge': {
      const { rows, total } = await knowledgeDao.listPublic({ keyword: q.keyword, page: q.page, pageSize: q.pageSize });
      return {
        type,
        total,
        items: rows.map((r) => ({ id: r.id, title: r.title, summary: summarize(r.content, 60), updatedAt: r.updatedAt }))
      };
    }
    case 'service': {
      const { rows, total } = await serviceDao.listPublic({ keyword: q.keyword, page: q.page, pageSize: q.pageSize });
      return {
        type,
        total,
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          summary: [r.department, r.locationBuilding, r.locationRoom].filter(Boolean).join(' · '),
          updatedAt: r.updatedAt
        }))
      };
    }
    case 'activity': {
      const { rows, total } = await activityDao.listPublic({ keyword: q.keyword, page: q.page, pageSize: q.pageSize });
      return {
        type,
        total,
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.description ? summarize(r.description, 60) : `${r.startTime} ~ ${r.endTime}`,
          updatedAt: r.updatedAt
        }))
      };
    }
    case 'course': {
      const { rows, total } = await courseDao.list({ keyword: q.keyword, page: q.page, pageSize: q.pageSize });
      return {
        type,
        total,
        items: rows.map((r) => ({
          id: r.id,
          title: r.name,
          summary: [r.code, r.semester].filter(Boolean).join(' · '),
          updatedAt: r.updatedAt
        }))
      };
    }
    case 'teacher': {
      const { rows, total } = await teacherDao.list({ keyword: q.keyword, page: q.page, pageSize: q.pageSize });
      return {
        type,
        total,
        items: rows.map((r) => ({
          id: r.id,
          title: r.name,
          summary: [r.title, r.officeName ? `办公室:${r.officeName}` : '', r.officeHours].filter(Boolean).join(' · '),
          updatedAt: r.updatedAt
        }))
      };
    }
    case 'location': {
      const { rows, total } = await locationDao.list({ keyword: q.keyword, page: q.page, pageSize: q.pageSize });
      return {
        type,
        total,
        items: rows.map((r) => ({
          id: r.id,
          title: r.name,
          summary: [r.campus, r.building, r.room].filter(Boolean).join(' · '),
          updatedAt: r.updatedAt
        }))
      };
    }
  }
}
