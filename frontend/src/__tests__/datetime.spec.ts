import { describe, expect, it } from 'vitest';
import { isDateString, isDateTimeString } from '@/utils/datetime';

// 日期/时间工具真实日历语义校验(GUI 验收 D-MED-2)
describe('utils/datetime 语义校验(D-MED-2)', () => {
  it('isDateString:格式对但日历不存在的日期必须拦截', () => {
    expect(isDateString('2026-13-99')).toBe(false);
    expect(isDateString('2026-13-40')).toBe(false);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2027-04-09')).toBe(true);
    expect(isDateString('2026-02-29')).toBe(false); // 2026 非闰年
    expect(isDateString('2024-02-29')).toBe(true); // 闰年
    expect(isDateString('2026/09/01')).toBe(false);
    expect(isDateString('2026-9-1')).toBe(false);
    expect(isDateString('')).toBe(false);
    expect(isDateString(null)).toBe(false);
  });

  it('isDateTimeString:日期部分须为真实存在的日期', () => {
    expect(isDateTimeString('2026-13-99 10:00:00')).toBe(false);
    expect(isDateTimeString('2026-10-24 10:00:00')).toBe(true);
    expect(isDateTimeString('2026-10-24')).toBe(false); // 缺时间部分
    expect(isDateTimeString('')).toBe(false);
  });
});
