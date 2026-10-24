import request from 'supertest';
import { createApp } from '../src/app';
import { execute, query } from '../src/config/db';
import * as aiLogDao from '../src/dao/ai-log.dao';
import { analyzeQuery } from '../src/ai/retriever/local-kb-retriever';
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
const SESSION_SHORT = 'd4444444-5555-4666-8777-888888888888';
const SESSION_DBFAIL = 'e5555555-6666-4777-8888-aaaaaaaaaaaa';
// Phase 3 补充:Key 未配置用例专用会话(不与既有会话混用,避免影响 total 断言)
const SESSION_NOKEY = 'e5555555-6666-4777-8888-bbbbbbbbbbbb';
const AI_SESSION_KEYS = [SESSION_ID, SESSION_EMPTY, SESSION_SECRET, SESSION_SHORT, SESSION_DBFAIL, SESSION_NOKEY];

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

  // Phase 3(02 设计 §1 降级判定):依赖本文件环境未配置 DEEPSEEK_API_KEY(backend/.env 该键为空);
  // 若日后 .env 配置真实 Key,本用例语义需随工厂行为同步调整
  it('Key 未配置:不发起 HTTP(fetch 未被调用),检索命中走降级模板', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    try {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ sessionId: SESSION_NOKEY, message: '校园卡丢了怎么补办?' });
      expect(res.status).toBe(200);
      expect(fetchSpy).not.toHaveBeenCalled();
      const d = res.body.data;
      expect(d.mode).toBe('fallback');
      expect(d.answer).toContain('降级模式');
      expect(d.sources.length).toBeGreaterThanOrEqual(1);
    } finally {
      fetchSpy.mockRestore();
    }
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
      .get(`/api/admin/ai-logs?startDate=2026/01/01`)
      .set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .get(`/api/admin/ai-logs?startDate=2099-01-01`)
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.total).toBe(0);
  });
});

describe('AI 检索短句与排序(体检修复 F2/审计 A-05)', () => {
  beforeAll(async () => {
    await insertKnowledge({
      categoryId: catId,
      title: `${MARK}校园跑打卡规则说明`,
      content: '本学期校园跑有效次数 60 次,请在体育课堂完成打卡,未达标者扣平时成绩。',
      status: 'published',
      isVerified: 1,
      effectiveFrom: dateOffset(-10),
      effectiveUntil: dateOffset(300)
    });
  });

  it('tokenize:2~8 字分段整句保留为优先词,并追加 2-gram 兜底', () => {
    const { terms, strongTerms } = analyzeQuery('校园跑有什么要求?');
    expect(strongTerms).toContain('校园跑有什么要求');
    expect(terms[0]).toBe('校园跑有什么要求');
    expect(terms).toContain('校园');
    expect(terms).toContain('要求');
  });

  it('8 字短问句:整句+2-gram 双路召回命中来源,不再误拒答', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: SESSION_SHORT, message: '校园跑有什么要求?' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.sources.length).toBeGreaterThanOrEqual(1);
    expect(d.answer).not.toContain('知识库未覆盖');
    expect(d.answer).toContain('降级模式');
    expect(d.sources[0].title).toContain('校园跑');
  });

  it('校园卡问句 top1 应为校园卡条目(查询词覆盖率去噪,不再被校园跑抢占)', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: SESSION_ID, message: '校园卡丢了怎么补办?' });
    expect(res.status).toBe(200);
    expect(res.body.data.sources[0].title).toContain('校园卡');
  });

  it('无关短问句仍如实拒答(sources 空,不编造红线不破坏)', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: SESSION_SHORT, message: '今天天气怎么样?' });
    expect(res.status).toBe(200);
    expect(res.body.data.answer).toContain('知识库未覆盖');
    expect(res.body.data.sources).toEqual([]);
  });
});

describe('assistant 落库失败兜底(体检修复 F3/审计 A-04,02 设计 6.3)', () => {
  it('mock 落库抛错:仍返回 200 与回答,不阻塞响应', async () => {
    const originalInsert = aiLogDao.insertMessage;
    const spy = jest.spyOn(aiLogDao, 'insertMessage').mockImplementation(async (data) => {
      if (data.role === 'assistant') {
        throw new Error('mock: assistant 落库失败');
      }
      return originalInsert(data); // user 消息照常真实落库
    });
    try {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ sessionId: SESSION_DBFAIL, message: '校园卡丢了怎么补办?' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toContain('降级模式');
      expect(res.body.data.sources.length).toBeGreaterThanOrEqual(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('落库断言:该会话仅 user 消息写入,assistant 缺席但不影响应答', async () => {
    const sessions = await query<Array<{ id: number }>>('SELECT id FROM ai_chat_session WHERE session_key = ?', [
      SESSION_DBFAIL
    ]);
    expect(sessions.length).toBe(1);
    const messages = await query<Array<{ role: string }>>(
      'SELECT role FROM ai_chat_message WHERE session_id = ? ORDER BY id ASC',
      [sessions[0].id]
    );
    expect(messages.map((m) => m.role)).toEqual(['user']);
  });
});
