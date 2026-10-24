/**
 * 仅由 ai-chat-llm.test.ts 作为"首个 import"加载:
 * 在任何 src 模块(env.ts 求值)之前注入"DEEPSEEK_API_KEY 已配置"的文件级测试环境,
 * 使 llm 工厂返回 DeepSeekAdapter,HTTP 全部由 jest.spyOn(global,'fetch') mock 覆盖。
 *
 * 注意:
 * 1. 本模块不得 import src/ 下任何模块(避免提前触发 env.ts 求值,顺序失效);
 * 2. 环境注入是顶层副作用(ES import 被提升,普通赋值语句无法先于 src 模块求值);
 * 3. DEEPSEEK_BASE_URL 指向本机未监听端口——即便 fetch mock 意外失效,
 *    也是毫秒级本地连接拒绝走降级,绝不会打出真实外网请求;
 * 4. restoreLlmEnv() 须在该测试文件 afterAll 调用,避免 runInBand 下泄漏到后续测试文件。
 */
const ORIGINAL = {
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  LLM_TIMEOUT_MS: process.env.LLM_TIMEOUT_MS
};

function restoreOne(key: keyof typeof ORIGINAL): void {
  if (ORIGINAL[key] === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = ORIGINAL[key];
  }
}

// 强制覆盖(非 ?? 兜底):本文件语义即"Key 已配置";超时缩到 500ms 便于超时用例
process.env.DEEPSEEK_API_KEY = 'test-sk-deepseek-mock';
process.env.DEEPSEEK_BASE_URL = 'http://127.0.0.1:59999';
process.env.DEEPSEEK_MODEL = 'deepseek-chat';
process.env.LLM_TIMEOUT_MS = '500';

export function restoreLlmEnv(): void {
  restoreOne('DEEPSEEK_API_KEY');
  restoreOne('DEEPSEEK_BASE_URL');
  restoreOne('DEEPSEEK_MODEL');
  restoreOne('LLM_TIMEOUT_MS');
}
