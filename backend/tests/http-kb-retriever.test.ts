import { jest } from '@jest/globals';
import { cleanupByMark, dateOffset, insertCategory, insertKnowledge, MARK } from './helpers';

/**
 * 外部知识库接入演示(mock fetch,不发真实网络请求):
 * 验证 HttpKbRetriever 请求契约、工厂级联回落与拒答红线。
 * 对应 docs/design/06-知识库对接说明.md。
 */

// 动态 import,保证 env 在 mock 之前不触发 KB 分支
async function importFactory(kbBaseUrl?: string, kbTimeout = 5000) {
  const original = { ...process.env };
  if (kbBaseUrl) process.env.KB_API_BASE_URL = kbBaseUrl;
  else delete process.env.KB_API_BASE_URL;
  process.env.KB_TIMEOUT_MS = String(kbTimeout);
  jest.resetModules();
  try {
    const factory = await import('../src/ai/retriever');
    const http = await import('../src/ai/retriever/http-kb-retriever');
    return { factory, http };
  } finally {
    process.env = original;
  }
}

describe('外部知识库接入(方式 A:HTTP 检索接口)', () => {
  afterAll(async () => {
    await cleanupByMark();
  });

  afterEach(() => {
    (global.fetch as unknown as jest.Mock)?.mockRestore?.();
  });

  it('演示 1:外部库返回条目 → 检索成功,retriever=http_kb,字段映射正确', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 101,
              title: '2026 级新生军训安排',
              snippet: '军训时间:开学第一周至第三周…',
              source: '武装部 2026 年迎新通知(迎新服务知识库(外部演示库))',
              updatedAt: '2026-08-20 09:00:00'
            }
          ]
        }),
        { status: 200 }
      )
    );
    const { http } = await importFactory('http://localhost:9500');
    const retriever = new http.HttpKbRetriever('http://localhost:9500');
    const result = await retriever.retrieve('新生军训是什么安排?');

    expect(result.retriever).toBe('http_kb');
    expect(result.isReliable).toBe(true);
    expect(result.items[0].title).toContain('军训');
    expect(result.items[0].type).toBe('knowledge');
    // 请求契约:POST {base}/retrieve,body 含 question 与 topK
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://localhost:9500/retrieve');
    expect(init).toBeDefined();
    expect(init!.method).toBe('POST');
    expect(JSON.parse(String(init!.body)).question).toBe('新生军训是什么安排?');
  });

  it('演示 2:外部库不可用(连接拒绝) → 工厂级联回本地检索器,不抛错', async () => {
    // 级联回本地检索需要本地有可命中内容:准备 TCK 标记的已发布知识(用后清理)
    const catId = await insertCategory(`${MARK}级联测试分类`);
    await insertKnowledge({
      categoryId: catId,
      title: `${MARK}校园卡遗失补办流程`,
      content: '一、挂失:登录校园卡自助服务平台或到一卡通服务中心办理挂失;二、补办:携带本人身份证到一卡通服务中心(综合服务楼 1 层 108 室)办理。',
      source: '测试来源',
      status: 'published',
      effectiveFrom: dateOffset(-1),
      effectiveUntil: dateOffset(30)
    });
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const { factory } = await importFactory('http://localhost:9500');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const retriever = factory.createRetriever();
    // 问题取本地库已知条目,级联后应命中本地内容
    const result = await retriever.retrieve('校园卡丢了怎么补办?');

    expect(result.retriever).toBe('local_kb');
    expect(result.isReliable).toBe(true);
    warnSpy.mockRestore();
  });

  it('演示 3:外部库返回空 items → isReliable=false(拒答红线,不编造)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    );
    const { http } = await importFactory('http://localhost:9500');
    const retriever = new http.HttpKbRetriever('http://localhost:9500');
    const result = await retriever.retrieve('今天天气怎么样');
    expect(result.items).toEqual([]);
    expect(result.isReliable).toBe(false);
  });

  it('演示 4:未配置 KB_API_BASE_URL → 工厂直接返回本地检索器(fetch 不被调用)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const { factory } = await importFactory(undefined);
    const retriever = factory.createRetriever();
    expect(retriever).toBeInstanceOf(Object);
    await retriever.retrieve('校园卡丢了怎么补办?');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('演示 5:外部库超时 → 5 秒中止并抛错(级联前提)', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('This operation was aborted')));
          // 永不 resolve,模拟挂起
        }) as never
    );
    const { http } = await importFactory('http://localhost:9500', 50);
    const retriever = new http.HttpKbRetriever('http://localhost:9500', undefined, 50);
    await expect(retriever.retrieve('军训')).rejects.toThrow();
  });
});
