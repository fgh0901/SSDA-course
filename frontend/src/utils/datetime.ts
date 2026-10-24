// 日期时间工具:契约 1.4,DATE=YYYY-MM-DD,DATETIME=YYYY-MM-DD HH:mm:ss(东八区)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function isDateString(v: unknown): boolean {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  // 语义校验:月份/日期须为真实存在的日期(如 2026-13-40 视为非法)
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function isDateTimeString(v: unknown): boolean {
  if (typeof v !== 'string' || !DATETIME_RE.test(v)) return false;
  // 语义校验:日期部分须为真实存在的日期(如 2026-13-99 10:00:00 视为非法)
  return isDateString(v.slice(0, 10));
}

/** 该日期(YYYY-MM-DD)是否已过今天(客户端仅做列表展示;详情页以服务端 isExpired 为准) */
export function isExpiredOn(effectiveUntil: string | undefined | null): boolean {
  if (!effectiveUntil || !isDateString(effectiveUntil)) return false;
  const until = new Date(`${effectiveUntil}T23:59:59`);
  return until.getTime() < Date.now();
}

/** el-date-picker 值(YYYY-MM-DD)转 DATETIME(YYYY-MM-DD HH:mm:ss);空值返回 undefined */
export function dateToDateTime(date: string | undefined | null, endOfDay = false): string | undefined {
  if (!date) return undefined;
  return `${date} ${endOfDay ? '23:59:59' : '00:00:00'}`;
}
