import { query } from '../../config/db';
import { todayStr } from '../../utils/datetime';
import { snippet } from '../../utils/text';
import type { KnowledgeRetriever, RetrievedSource, RetrieverResult, SourceType } from './types';

/** 低频疑问词/停用词:不作为检索词 */
const STOPWORDS = new Set([
  '请问', '我想', '知道', '什么', '怎么', '怎样', '如何', '哪里', '哪些', '需要', '可以',
  '是否', '一下', '应该', '如果', '还有', '关于', '咨询', '查询', '告诉', '帮助', '办理',
  '在校', '学校', '大学', '同学', '新生', '相关', '情况', '问题', '谢谢', '麻烦', '你们'
]);

const TOP_K = 5;
const SCORE_THRESHOLD = 1;

interface TableConfig {
  type: SourceType;
  table: string;
  enabledCond: string; // 仅已发布/上架内容可被检索(02 设计 2.1)
  titleCol: string;
  bodyCols: string[];
  extraCols: string;
  sourceExpr: string; // 每条结果的原始来源标注
}

const TABLES: TableConfig[] = [
  {
    type: 'knowledge',
    table: 'knowledge',
    enabledCond: "status = 'published'",
    titleCol: 'title',
    bodyCols: ['content'],
    extraCols: ', is_verified AS isVerified, effective_until AS effectiveUntil',
    sourceExpr: 'source'
  },
  {
    type: 'service',
    table: 'service_guide',
    enabledCond: 'is_enabled = 1',
    titleCol: 'title',
    bodyCols: ['materials', 'process', 'department'],
    extraCols: '',
    sourceExpr: 'department'
  },
  {
    type: 'activity',
    table: 'campus_activity',
    enabledCond: 'is_enabled = 1',
    titleCol: 'title',
    bodyCols: ['description'],
    extraCols: '',
    sourceExpr: "'校园活动发布平台'"
  },
  {
    type: 'course',
    table: 'course',
    enabledCond: '1 = 1',
    titleCol: 'name',
    bodyCols: ['description'],
    extraCols: '',
    sourceExpr: "'教务处开课信息'"
  },
  {
    type: 'teacher',
    table: 'teacher',
    enabledCond: '1 = 1',
    titleCol: 'name',
    bodyCols: ['title'],
    extraCols: '',
    sourceExpr: "'人事处教师名录'"
  },
  {
    type: 'location',
    table: 'location',
    enabledCond: '1 = 1',
    titleCol: 'name',
    bodyCols: ['description'],
    extraCols: '',
    sourceExpr: "'校园地点信息库'"
  }
];

/** 简单分词:按标点/空白切分,去停用词,长段切 2-gram 兜底(Phase 2 初版实现) */
export function tokenize(question: string): string[] {
  const segments = question
    .split(/[\s,，。?？!！、;；:："'“”‘’()()【】\[\]{}\-—~~.]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const terms: string[] = [];
  for (const seg of segments) {
    if (seg.length >= 2 && seg.length <= 8 && !STOPWORDS.has(seg)) {
      terms.push(seg);
    } else if (seg.length > 8) {
      // 长句滑窗取 2-gram,最多 6 个
      for (let i = 0; i + 2 <= seg.length && terms.length < 12; i += 2) {
        const gram = seg.slice(i, i + 2);
        if (!STOPWORDS.has(gram)) terms.push(gram);
      }
    }
  }
  // 兜底:全部被过滤时退回去重后的原始段
  if (terms.length === 0 && segments.length > 0) {
    return Array.from(new Set(segments)).slice(0, 4);
  }
  return Array.from(new Set(terms)).slice(0, 8);
}

interface RawRow {
  id: number;
  title: string;
  source: string;
  updatedAt: string;
  isVerified?: number;
  effectiveUntil?: string | null;
  body: string | null;
}

/**
 * LocalKbRetriever(默认检索器,02 设计 2.1):
 * - 数据范围仅已发布/上架内容,下架/草稿/待审核检索不到;
 * - 全部 LIKE CONCAT('%', ?, '%') 参数化,关键词只进检索参数(注入防线);
 * - 打分 = 标题命中 ×3 + 正文命中 ×1 + 已核实 ×1 + 在有效期内 ×1;
 * - 最高分低于阈值(1)时 isReliable=false。
 */
export class LocalKbRetriever implements KnowledgeRetriever {
  async retrieve(question: string): Promise<RetrieverResult> {
    const terms = tokenize(question);
    if (terms.length === 0) {
      return { items: [], isReliable: false, retriever: 'local_kb' };
    }
    const rows = await Promise.all(TABLES.map((t) => this.searchTable(t, terms)));
    const candidates: RetrievedSource[] = rows.flat();
    candidates.sort((a, b) => b.score - a.score);
    const items = candidates.slice(0, TOP_K);
    const isReliable = items.length > 0 && items[0].score >= SCORE_THRESHOLD;
    return { items, isReliable, retriever: 'local_kb' };
  }

  private async searchTable(cfg: TableConfig, terms: string[]): Promise<RetrievedSource[]> {
    const searchCols = [cfg.titleCol, ...cfg.bodyCols];
    const likeGroup = searchCols
      .map((col) => `${col} LIKE CONCAT('%', ?, '%')`)
      .join(' OR ');
    const termConds = terms.map(() => `(${likeGroup})`).join(' OR ');
    const params = terms.flatMap((t) => searchCols.map(() => t));
    const sql = `SELECT id, ${cfg.titleCol} AS title, ${cfg.sourceExpr} AS source,
      updated_at AS updatedAt${cfg.extraCols},
      CONCAT(${cfg.bodyCols.join(", ' ', ")}) AS body
      FROM ${cfg.table}
      WHERE ${cfg.enabledCond} AND (${termConds})`;
    const rows = await query<Array<RawRow & { source: string }>>(sql, params);
    return rows.map((row) => this.toSource(cfg.type, row, terms));
  }

  private toSource(type: SourceType, row: RawRow, terms: string[]): RetrievedSource {
    let score = 0;
    const title = String(row.title ?? '');
    const body = row.body ? String(row.body) : '';
    for (const term of terms) {
      if (title.includes(term)) score += 3;
      if (body.includes(term)) score += 1;
    }
    if (type === 'knowledge') {
      if (row.isVerified === 1) score += 1;
      const inValidity = !row.effectiveUntil || row.effectiveUntil >= todayStr();
      if (inValidity) score += 1;
    }
    let snip = snippet(body || title, terms);
    // 过期知识可被检索,但 snippet 带"(已过期)"标注(02 设计 2.1)
    if (type === 'knowledge' && row.effectiveUntil && row.effectiveUntil < todayStr()) {
      snip = `${snip}(已过期)`;
    }
    return {
      type,
      id: row.id,
      title,
      snippet: snip.slice(0, 120),
      source: String(row.source ?? ''),
      updatedAt: row.updatedAt,
      score
    };
  }
}
