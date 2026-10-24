/** 正文摘要:压平空白后截取前 maxLen 字,超长补省略号(契约 2.3 summary) */
export function summarize(content: string, maxLen = 80): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen)}…`;
}

/** 截取命中片段:定位首个关键词位置,取前后窗口(≤120 字,AI 检索 snippet) */
export function snippet(content: string, terms: string[], window = 60): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  for (const term of terms) {
    const idx = flat.indexOf(term);
    if (idx >= 0) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(flat.length, idx + window);
      const prefix = start > 0 ? '…' : '';
      const suffix = end < flat.length ? '…' : '';
      return `${prefix}${flat.slice(start, end)}${suffix}`.slice(0, 120);
    }
  }
  return flat.slice(0, window);
}
