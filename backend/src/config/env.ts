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

  JWT_SECRET: z.string().min(16).default('ssda-dev-secret-change-me-please'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  // AI 生成(DeepSeek,OpenAI 兼容;未配置 Key 时 ChatService 自动降级)
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  LLM_TIMEOUT_MS: z.coerce.number().default(20000),

  // 外部知识库(可选;未配置时使用本地 Mock 检索器)
  KB_API_BASE_URL: z.string().optional(),
  KB_API_TOKEN: z.string().optional()
});

export const env = envSchema.parse(process.env);
