import { z } from 'zod';

/** 公共分页参数(契约 1.2:page 从 1 起,pageSize 默认 10 上限 100) */
export const paginationSchema = z.object({
  page: z.coerce
    .number({ error: 'page 必须为数字' })
    .int('page 必须为整数')
    .min(1, 'page 必须 ≥1')
    .default(1),
  pageSize: z.coerce
    .number({ error: 'pageSize 必须为数字' })
    .int('pageSize 必须为整数')
    .min(1, 'pageSize 必须 ≥1')
    .max(100, 'pageSize 最大为 100')
    .default(10)
});

/** 公共关键词参数:去空格后 ≤50 字符,空串视为未传(TC-02) */
export const keywordSchema = z
  .string({ error: 'keyword 必须为字符串' })
  .trim()
  .max(50, 'keyword 最长 50 字符')
  .optional();

/** 路径参数 id(正整数) */
export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'id 必须为数字' })
    .int('id 必须为整数')
    .positive('id 必须为正整数')
});

export type Pagination = z.infer<typeof paginationSchema>;

/** 是否启用/上架/核实字段:0 或 1 */
export const flagSchema = z.union([z.literal(0), z.literal(1)]);

/** 日期形状(YYYY-MM-DD)与日期时间形状(YYYY-MM-DD HH:mm:ss)正则 */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/**
 * 真实日历校验(F1/D-MED-2):正则只保证 YYYY-MM-DD 形状,拦不住 2026-02-30、2026-13-01。
 * 用 Date.UTC 解析后回验年月日一致——月/日越界与平闰年(2025-02-29)均被覆盖。
 */
export function isRealCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** 真实日历日期时间校验:日期部分真实存在,且时间分量合法(小时 <24,分秒 <60) */
export function isRealCalendarDateTime(value: string): boolean {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!m) return false;
  if (!isRealCalendarDate(m[1])) return false;
  return Number(m[2]) < 24 && Number(m[3]) < 60 && Number(m[4]) < 60;
}

/** 为日期字段追加真实日历 refine(D-MED-2);失败消息含具体值,便于前端 toast 直接展示 */
export function refineRealDate<T extends z.ZodString>(schema: T): T {
  return schema.refine(isRealCalendarDate, {
    error: (iss) => `日期不合法:${String(iss.input ?? '')} 不是真实存在的日期`
  }) as T;
}

/** 为日期时间字段追加真实日历/时间分量 refine(D-MED-2) */
export function refineRealDateTime<T extends z.ZodString>(schema: T): T {
  return schema.refine(isRealCalendarDateTime, {
    error: (iss) => {
      const v = String(iss.input ?? '');
      const [d = '', t = ''] = v.split(' ');
      return isRealCalendarDate(d) ? `时间不合法:${t} 不是合法的时间` : `日期不合法:${d} 不是真实存在的日期`;
    }
  }) as T;
}
