import { createLlmAdapter, LlmError } from './llm';
import { createRetriever } from './retriever';
import type { RetrievedSource } from './retriever/types';
import * as aiLogDao from '../dao/ai-log.dao';

export interface AiReply {
  answer: string;
  sources: Array<Pick<RetrievedSource, 'type' | 'id' | 'title' | 'source' | 'updatedAt'>>;
  mode: 'deepseek' | 'fallback';
  retriever: string;
}

/** 检索不到可信内容时的固定拒答话术(禁止编造,契约 2.15) */
const NOT_COVERED_ANSWER = '知识库未覆盖该问题,请咨询相关部门核实。';

/** 降级模板首行声明(02 设计 4 节:固定首行注明降级模式) */
const FALLBACK_NOTICE = '当前为降级模式,回答由本地知识库检索结果直接整理,仅供参考,请以官方通知为准。';

/** system prompt(02 设计 3.1 v1):仅包含固定约束与检索资料,用户输入不得拼入(注入防线) */
function buildSystemPrompt(sources: RetrievedSource[]): string {
  const sourcesBlock = sources
    .map((s, i) => `[${i + 1}] ${s.title} | 类型:${s.type} | 摘要:${s.snippet} | 来源:${s.source} | 更新时间:${s.updatedAt}`)
    .join('\n');
  return [
    '你是"新生校园知识库助手",服务对象是大学新生。请严格遵守以下规则:',
    '1. 只依据"资料"部分提供的内容回答;资料之外的信息一律不得编造或推断。',
    '2. 回答末尾列出引用来源编号,格式如:',
    '   来源:',
    '   [1] 条目标题(来源:xxx,更新于 YYYY-MM-DD)',
    '   仅引用实际使用的条目。',
    '3. 如果资料不足以回答用户问题,或资料之间互相矛盾,回答:"知识库未覆盖该问题,请咨询相关部门核实",不要给出未经验证的细节。',
    '4. 涉及有效期、费用、办理时间等易变信息,提醒用户以最新通知为准。',
    '5. 不收集、不询问、不记录用户的姓名、学号、身份证号等个人身份信息。',
    '6. 不回答与校园生活、办事、教学无关的问题,礼貌说明职责范围。',
    '7. 使用简体中文,语气友好,回答不超过 300 字,步骤类问题用编号列表。',
    '',
    '以下是检索到的资料(每条以 [编号] 开头):',
    sourcesBlock
  ].join('\n');
}

/** 降级模板回答:检索结果模板化组织,列出条目标题与要点,标注来源编号 */
function buildFallbackAnswer(sources: RetrievedSource[]): string {
  const body = sources
    .map((s, i) => `${i + 1}. ${s.title} — ${s.snippet}`)
    .join('\n');
  const refs = sources
    .map((s, i) => `[${i + 1}] ${s.title}(来源:${s.source},更新于 ${s.updatedAt.slice(0, 10)})`)
    .join('\n');
  return `${FALLBACK_NOTICE}\n根据本地知识库检索结果,以下条目可能对您有帮助:\n${body}\n\n来源:\n${refs}`;
}

/**
 * AI 对话主链路(契约 2.15 + 02 设计第 1/6 节):
 * 校验 → 检索 → 生成(降级)→ 落库 → 返回
 * DEEPSEEK_API_KEY 未配置时走降级模式,这是预期行为。
 */
export async function chat(sessionId: string, message: string): Promise<AiReply> {
  const startedAt = Date.now();

  // 1. 惰性建会话;user 消息在检索前落库(即使后续异常也有输入记录)
  const sessionIdDb = await aiLogDao.findOrCreateSession(sessionId);
  await aiLogDao.insertMessage({ sessionId: sessionIdDb, role: 'user', content: message });

  // 2. 知识库检索(默认 LocalKbRetriever)
  const retriever = createRetriever();
  const result = await retriever.retrieve(message);
  const sourceItems = result.items.map((s) => ({
    type: s.type,
    id: s.id,
    title: s.title,
    source: s.source,
    updatedAt: s.updatedAt
  }));

  let answer: string;
  let mode: AiReply['mode'];

  if (!result.isReliable) {
    // 3. 无可信内容:不调 LLM,直接拒答,sources=[](禁止编造)
    answer = NOT_COVERED_ANSWER;
    mode = 'fallback';
  } else {
    // 4. 有可信内容:尝试 LLM;未配置 Key/超时/异常 → 降级模板(不返回 500)
    const llm = createLlmAdapter();
    try {
      const llmResult = await llm.chatCompletion(buildSystemPrompt(result.items), message);
      answer = llmResult.answer;
      mode = 'deepseek';
    } catch (err) {
      if (err instanceof LlmError) {
        console.warn(`[ai-chat] LLM 不可用,走降级模板:${err.message}`);
      } else {
        console.warn('[ai-chat] LLM 调用异常,走降级模板', err);
      }
      answer = buildFallbackAnswer(result.items);
      mode = 'fallback';
    }
  }

  // 5. assistant 消息落库(02 设计 6.3:失败不阻塞响应,记 error 日志,对话可用性优先)
  const latencyMs = Date.now() - startedAt;
  try {
    await aiLogDao.insertMessage({
      sessionId: sessionIdDb,
      role: 'assistant',
      content: answer,
      sourcesJson: sourceItems,
      mode,
      retriever: result.retriever,
      latencyMs
    });
  } catch (err) {
    console.error('[ai-chat] assistant 消息落库失败(不阻塞回答返回,可由导出兜底补录)', err);
  }

  return { answer, sources: sourceItems, mode, retriever: result.retriever };
}
