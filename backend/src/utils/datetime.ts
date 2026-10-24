/** 统一东八区时间工具(契约 1.4:DATE=YYYY-MM-DD,DATETIME=YYYY-MM-DD HH:mm:ss) */
const TZ = 'Asia/Shanghai';

/** 当前日期时间:'YYYY-MM-DD HH:mm:ss' */
export function nowDateTime(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ, hour12: false });
}

/** 当前日期:'YYYY-MM-DD'(用于过期判定,避免客户端时钟偏差) */
export function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
}

/** 导出文件名时间戳:'YYYYMMDD-HHmm' */
export function fileTimestamp(): string {
  const compact = nowDateTime().replace(/[-: ]/g, '');
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}`;
}
