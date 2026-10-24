/**
 * AI 对话日志导出脚本(ssda-ai-log 轨道①,sim: npm run export:ai-logs)
 * 读取 ai_chat_session + ai_chat_message,输出 JSONL 到 docs/ai-logs/exports/,
 * 并在控制台输出总条数与 fallback 条数(降级率,鲁棒性证据)。
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { fileTimestamp } from '../utils/datetime';

interface MessageRow {
  sessionKey: string;
  role: 'user' | 'assistant';
  content: string;
  sourcesJson: unknown;
  mode: string | null;
  createdAt: string;
}

async function main(): Promise<void> {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssda',
    dateStrings: true
  });

  try {
    const [rows] = (await conn.query(
      `SELECT s.session_key AS sessionKey, m.role, m.content, m.sources_json AS sourcesJson,
              m.mode, m.created_at AS createdAt
       FROM ai_chat_message m JOIN ai_chat_session s ON s.id = m.session_id
       ORDER BY m.created_at ASC, m.id ASC`
    )) as unknown as [MessageRow[]];

    const outDir = path.resolve(__dirname, '../../../docs/ai-logs/exports');
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `ai-chat-export-${fileTimestamp()}.jsonl`);

    const lines = rows.map((row) => {
      let sources: unknown = row.sourcesJson;
      if (typeof sources === 'string') {
        try {
          sources = JSON.parse(sources);
        } catch {
          sources = [];
        }
      }
      return JSON.stringify({
        sessionId: row.sessionKey,
        role: row.role,
        content: row.content,
        sources: sources ?? [],
        mode: row.mode,
        createdAt: row.createdAt
      });
    });
    fs.writeFileSync(filePath, lines.length > 0 ? `${lines.join('\n')}\n` : '', 'utf8');

    const total = rows.length;
    const fallbackCount = rows.filter((r) => r.mode === 'fallback').length;
    console.log(`[export:ai-logs] 已导出 ${total} 条消息 → ${filePath}`);
    console.log(`[export:ai-logs] 其中 fallback(降级)条数:${fallbackCount},降级率:${total > 0 ? ((fallbackCount / total) * 100).toFixed(1) : '0.0'}%`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[export:ai-logs] 导出失败:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
