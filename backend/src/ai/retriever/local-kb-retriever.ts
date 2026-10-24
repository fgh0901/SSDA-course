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

/** 查询分析结果:整句词(2~8 字分段,优先匹配)+ 全部检索词(含 2-gram 兜底) */
export interface QueryAnalysis {
  /** 全部检索词(整句词在前),用于 SQL LIKE 与 snippet 定位 */
  terms: string[];
  /** 2~8 字分段整句词:命中时加权(整句匹配 > 2-gram 命中) */
  strongTerms: string[];
}

/**
 * 查询分析(体检修复 F2/审计 A-05):
 * - 2~8 字分段整句保留为 strongTerm 直接参与匹配(整句优先,不做截断丢弃);
 * - 同时对所有 ≥3 字分段切重叠 2-gram(步长 1,保住"补办/丢了"等词边界),短问句
 *   (如"校园跑有什么要求")不再因整句无子串命中而漏检;
 * - 各分段 gram 轮询合并,长问句靠后的分段同样参与召回;去停用词,总量受限。
 */
export function analyzeQuery(question: string): QueryAnalysis {
  const segments = question
    .split(/[\s,，。?？!！、;；:："'“”‘’()()【】\[\]{}\-—~~.]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const strong: string[] = [];
  const gramsPerSeg: string[][] = [];
  for (const seg of segments) {
    if (seg.length >= 2 && seg.length <= 8 && !STOPWORDS.has(seg)) {
      strong.push(seg);
    }
    // 重叠 2-gram 兜底:≥3 字的分段一律切分(含 2~8 字短句),保证子词可召回
    if (seg.length >= 3) {
      const grams: string[] = [];
      for (let i = 0; i + 2 <= seg.length && grams.length < 12; i += 1) {
        const gram = seg.slice(i, i + 2);
        if (!STOPWORDS.has(gram)) grams.push(gram);
      }
      gramsPerSeg.push(grams);
    }
  }
  // 轮询合并各分段 gram:避免只取首段导致长问句后段词丢失
  const grams: string[] = [];
  for (let round = 0; round < 12 && grams.length < 12; round += 1) {
    for (const segGrams of gramsPerSeg) {
      if (round < segGrams.length && grams.length < 12) grams.push(segGrams[round]);
    }
  }
  const strongTerms = Array.from(new Set(strong)).slice(0, 4);
  const strongSet = new Set(strongTerms);
  const gramTerms = Array.from(new Set(grams)).filter((g) => !strongSet.has(g)).slice(0, 8);
  const terms = [...strongTerms, ...gramTerms];
  // 兜底:全部被过滤时退回去重后的原始段
  if (terms.length === 0 && segments.length > 0) {
    return { terms: Array.from(new Set(segments)).slice(0, 4), strongTerms: [] };
  }
  return { terms, strongTerms };
}

/** 简单分词:整句词在前 + 2-gram 兜底,去停用词(Phase 2 初版实现,F2 增强) */
export function tokenize(question: string): string[] {
  return analyzeQuery(question).terms;
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
 * - 打分 = (标题命中 ×3 + 正文命中 ×1,整句词 ×2 加权)×(1 + 查询词覆盖率)
 *   + 已核实 ×1 + 在有效期内 ×1(F2:覆盖率权重去排序噪声);
 * - 最高分低于阈值(1)时 isReliable=false。
 */
export class LocalKbRetriever implements KnowledgeRetriever {
  async retrieve(question: string): Promise<RetrieverResult> {
    const { terms, strongTerms } = analyzeQuery(question);
    if (terms.length === 0) {
      return { items: [], isReliable: false, retriever: 'local_kb' };
    }
    const strongSet = new Set(strongTerms);
    const rows = await Promise.all(TABLES.map((t) => this.searchTable(t, terms, strongSet)));
    const candidates: RetrievedSource[] = rows.flat();
    candidates.sort((a, b) => b.score - a.score);
    const items = candidates.slice(0, TOP_K);
    const isReliable = items.length > 0 && items[0].score >= SCORE_THRESHOLD;
    return { items, isReliable, retriever: 'local_kb' };
  }

  private async searchTable(cfg: TableConfig, terms: string[], strongTerms: Set<string>): Promise<RetrievedSource[]> {
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
    return rows.map((row) => this.toSource(cfg.type, row, terms, strongTerms));
  }

  private toSource(type: SourceType, row: RawRow, terms: string[], strongTerms: Set<string>): RetrievedSource {
    const title = String(row.title ?? '');
    const body = row.body ? String(row.body) : '';
    let matchScore = 0;
    let covered = 0;
    for (const term of terms) {
      const inTitle = title.includes(term);
      const inBody = body.includes(term);
      if (!inTitle && !inBody) continue;
      covered += 1;
      // 整句词命中 ×2 加权(整句匹配 > 2-gram 命中,F2)
      const weight = strongTerms.has(term) ? 2 : 1;
      if (inTitle) matchScore += 3 * weight;
      if (inBody) matchScore += 1 * weight;
    }
    // 查询词覆盖率乘数:命中更多不同查询词的条目优先,抑制单 2-gram 高频噪声(F2)
    const coverage = terms.length > 0 ? covered / terms.length : 0;
    let score = matchScore * (1 + coverage);
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
