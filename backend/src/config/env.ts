import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('ssda'),

  // 必填(F1/审计 A-01):缺失或过短时启动即失败,不再提供代码内默认密钥
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('12h'),

  // CORS 白名单(F5/审计 A-02):逗号分隔多个 origin,默认放行本地前端开发地址
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // AI 生成(DeepSeek,OpenAI 兼容;未配置 Key 时 ChatService 自动降级)
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  LLM_TIMEOUT_MS: z.coerce.number().default(20000),

  // 外部知识库(可选;未配置时使用本地 Mock 检索器)
  KB_API_BASE_URL: z.string().optional(),
  KB_API_TOKEN: z.string().optional(),
  KB_TIMEOUT_MS: z.coerce.number().default(5000)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // fail fast:环境变量缺失/非法直接拒绝启动,错误信息指明具体字段
  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || '(根)'}: ${issue.message}`)
    .join('; ');
  throw new Error(`[env] 环境变量校验失败,服务拒绝启动 → ${detail}`);
}
export const env = parsed.data;
