import request from 'supertest';
import { createApp } from '../src/app';
import { execute, query } from '../src/config/db';
import {
  cleanupByMark,
  createAdmin,
  dateOffset,
  insertCategory,
  insertKnowledge,
  login,
  MARK
} from './helpers';

const app = createApp();
const USERNAME = `${MARK}admin-ai`;
const PASSWORD = 'test-pass-123';
let token: string;
let catId: number;

const SESSION_ID = 'a1111111-2222-4333-8444-555555555555';
const SESSION_EMPTY = 'b2222222-3333-4777-8888-999999999999';
const SESSION_SECRET = 'c3333333-4444-4aaa-8bbb-cccccccccccc';
const AI_SESSION_KEYS = [SESSION_ID, SESSION_EMPTY, SESSION_SECRET];

beforeAll(async () => {
  await cleanupByMark();
  await createAdmin(USERNAME, PASSWORD);
  token = await login(app, USERNAME, PASSWORD);
  catId = await insertCategory(`${MARK}AI 检索分类`);
  await insertKnowledge({
    categoryId: catId,
    title: `${MARK}校园卡遗失补办流程`,
    content: '一、挂失;二、携带本人身份证到一卡通服务中心补办,工本费 20 元;三、旧卡余额自动转入新卡。',
    status: 'published',
    isVerified: 1,
    effectiveFrom: dateOffset(-10),
    effectiveUntil: dateOffset(300)
  });
});

afterAll(async () => {
  // AI 会话 uuid 不能带 MARK 前缀,按固定 key 清理(数组需嵌套一层,mysql2 才会展开 IN (?))
  await execute('DELETE m FROM ai_chat_message m JOIN ai_chat_session s ON s.id = m.session_id WHERE s.session_key IN (?)', [
    AI_SESSION_KEYS
  ]);
  await execute('DELETE FROM ai_chat_session WHERE session_key IN (?)', [AI_SESSION_KEYS]);
  await cleanupByMark();
});

describe('AI 对话降级全链路(POST /api/ai/chat,契约 2.15/第 4 节,FR-13)', () => {
  it('检索命中:返回模板化回答 + 来源数组 + mode=fallback + retriever=local_kb', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: SESSION_ID, message: '校园卡丢了怎么补办?' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.mode).toBe('fallback');
    expect(d.retriever).toBe('local_kb');
    expect(d.answer).toContain('降级模式');
    expect(d.answer).toContain('来源:');
    expect(d.answer).toContain('[1]');
    expect(d.sources.length).toBeGreaterThanOrEqual(1);
    const src = d.sources[0];
    expect(src).toMatchObject({ type: 'knowledge', title: `${MARK}校园卡遗失补办流程` });
    expect(src).toHaveProperty('id');
    expect(src).toHaveProperty('source');
    expect(src).toHaveProperty('updatedAt');
  });

  it('检索未命中:拒答话术 + sources 为空数组(禁止编造)', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: SESSION_EMPTY, message: '量子物理期末考试范围是什么XYZ' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.mode).toBe('fallback');
    expect(d.answer).toContain('知识库未覆盖');
    expect(d.answer).toContain('核实');
    expect(d.sources).toEqual([]);
  });

  it('可解释性:已下架/草稿/待审核知识不可被检索到', async () => {
    await insertKnowledge({
      categoryId: catId,
      title: `${MARK}秘密下架条目占位词QQZZ`,
      content: '机密内容',
      status: 'takedown',
      effectiveFrom: dateOffset(-1)
    });
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: SESSION_SECRET, message: '秘密下架条目占位词QQZZ' });
    expect(res.body.data.answer).toContain('知识库未覆盖');
    expect(res.body.data.sources).toEqual([]);
  });

  it('400 分支:sessionId 非 UUID 返回 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/ai/chat').send({ sessionId: 'not-a-uuid', message: '你好' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('sessionId');
  });

  it('400 分支:message 为空或超过 500 字', async () => {
    const empty = await request(app).post('/api/ai/chat').send({ sessionId: SESSION_ID, message: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.message).toContain('message');

    const tooLong = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: SESSION_ID, message: '问'.repeat(501) });
    expect(tooLong.status).toBe(400);
  });

  it('落库断言:user/assistant 双消息写入 ai_chat_message,assistant 带 sources_json/mode/retriever/latency_ms', async () => {
    const sessions = await query<Array<{ id: number }>>('SELECT id FROM ai_chat_session WHERE session_key = ?', [
      SESSION_ID
    ]);
    expect(sessions.length).toBe(1);
    const messages = await query<Array<{ role: string; mode: string | null; retriever: string | null; latency_ms: number | null; sources_json: string | null }>>(
      'SELECT role, mode, retriever, latency_ms, sources_json FROM ai_chat_message WHERE session_id = ? ORDER BY id ASC',
      [sessions[0].id]
    );
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].mode).toBeNull();
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].mode).toBe('fallback');
    expect(messages[1].retriever).toBe('local_kb');
    expect(messages[1].latency_ms).not.toBeNull();
    // mysql2 会把 JSON 列自动解析为对象,兼容字符串两种形态
    const rawSources = messages[1].sources_json;
    const sources = typeof rawSources === 'string' ? JSON.parse(rawSources) : rawSources;
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThanOrEqual(1);
  });

  it('隐私红线:落库仅有匿名 sessionId,无任何身份字段', async () => {
    const cols = await query<Array<{ COLUMN_NAME: string }>>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_chat_session'`
    );
    const names = cols.map((c) => c.COLUMN_NAME).join(',');
    expect(names).not.toMatch(/user|student|ip|device|account/i);
  });
});

describe('管理端 AI 日志(GET /api/admin/ai-logs,契约 3.19)', () => {
  it('TC-07 未带 token:401', async () => {
    const res = await request(app).get('/api/admin/ai-logs');
    expect(res.status).toBe(401);
  });

  it('按 sessionKey 过滤的分页列表,assistant 消息带 sources/mode/latencyMs', async () => {
    const res = await request(app)
      .get(`/api/admin/ai-logs?sessionKey=${SESSION_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    const assistant = res.body.data.list.find((i: { role: string }) => i.role === 'assistant');
    expect(assistant.mode).toBe('fallback');
    expect(assistant.latencyMs).toBeGreaterThan(0);
    expect(Array.isArray(assistant.sources)).toBe(true);
    expect(assistant.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('?export=1 返回 JSONL 文件流,每行含契约字段', async () => {
    const res = await request(app)
      .get(`/api/admin/ai-logs?sessionKey=${SESSION_ID}&export=1`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/jsonl');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="ai-chat-export-\d{8}-\d{4}\.jsonl"/);
    const lines = res.text.trim().split('\n').filter(Boolean);
    expect(lines.length).toBe(2);
    const rows = lines.map((l) => JSON.parse(l));
    const row = rows.find((r) => r.role === 'assistant')!;
    expect(row).toHaveProperty('sessionId', SESSION_ID);
    expect(row).toHaveProperty('role');
    expect(row).toHaveProperty('content');
    expect(row).toHaveProperty('sources');
    expect(row).toHaveProperty('mode', 'fallback');
    expect(row).toHaveProperty('createdAt');
  });

  it('日期过滤:startDate 400 校验与正常过滤', async () => {
    const bad = await request(app)
      .get('/api/admin/ai-logs?startDate=2026/01/01')
      .set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .get('/api/admin/ai-logs?startDate=2099-01-01')
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.total).toBe(0);
  });
});
