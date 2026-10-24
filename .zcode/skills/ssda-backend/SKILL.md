---
name: ssda-backend
description: SSDA 项目后端开发规范(Express + TypeScript + zod + mysql2 + Jest)。凡是在后端目录编写或修改任何代码——新增接口、写路由/控制器/服务/DAO、数据库查询、JWT 鉴权中间件、错误处理、Supertest 测试——必须先使用本 skill,确保分层、参数化 SQL 与统一响应包一次做对。
---

# ssda-backend:后端开发规范

目标读者:从未参与本项目的开发者/子 Agent。读完本文件,你应能直接写出符合项目分层、安全与测试要求的后端代码。

## 1. 技术栈与环境(冻结,不得更换)

- Node.js:本机 v24,**CI v22,代码必须兼容 Node 22**(不使用 Node 23+ 才有的 API)
- Express + TypeScript;校验 zod;驱动 mysql2(**参数化查询**)
- 鉴权:jsonwebtoken(JWT)+ bcryptjs(密码哈希)
- 测试:Jest + ts-jest + Supertest
- 数据库:MySQL 8.0,连接配置走 `.env`(不入 git),初始化脚本位于**仓库根** `D:\SSDA\db\`(`db/schema.sql` + `db/seed.sql`,总控裁决 2026-10-24)
- 端口:**3000**;前端 5173 通过 Vite proxy `/api` 访问本服务
- 响应包与状态码:见 `ssda-api-contract`,本文不重复定义
- **Phase 0 脚手架已存在的文件**(沿用或重构均可,重构须保持对外行为不变、以本 skill 模式为准):`src/app.ts`(导出 `createApp()` 供 Supertest)、`src/index.ts`(监听入口)、`src/utils/http.ts`(含 `HttpError` 与 `ok`/`fail` 响应包助手)、`src/middlewares/validate.ts`(zod 校验中间件工厂)、`src/middlewares/auth.ts`(requireAdmin)、`src/config/db.ts`(连接池 + `query()` 助手)、`src/middlewares/error.ts`(统一错误处理)

## 2. 目录结构

```text
backend/
├── src/
│   ├── routes/        # 路由定义:只做"路径 → 中间件 → 控制器"的装配
│   ├── controllers/   # 控制器:取参数、调 service、组装响应包
│   ├── services/      # 业务逻辑:规则、事务、跨表编排;ai/ 子目录放 AI 适配器
│   ├── dao/           # 数据访问:只写 SQL(参数化)与行↔对象映射
│   ├── middlewares/   # requireAuth / requireRole / errorHandler 等
│   ├── validators/    # zod schema,按模块一个文件
│   ├── config/        # db 连接池、env 读取、日志
│   ├── utils/         # AppError、logger 等通用工具
│   ├── app.ts         # Express 应用(导出 createApp() 供 Supertest 用)
│   └── index.ts       # 监听 3000(现有脚手架文件名;不新增 server.ts)
├── tests/             # *.test.ts,与 src 同构命名
├── .env.example       # 入 git;真实 .env 不入 git
└── jest.config.js
```

> 数据库脚本 `schema.sql`/`seed.sql` 放**仓库根** `db/` 目录(与 backend/ 平级),不放 backend/ 内。

## 3. 分层职责(严格单向调用)

```
routes → controllers → services → dao → MySQL
```

- **routes**:声明路径、挂载校验/鉴权中间件,不写业务
- **controllers**:解析 query/body(zod 在此触发)、调用 service、返回 `{ success, data }`;不写 SQL、不碰连接池
- **services**:业务规则(如"仅 published 且未过期对学生可见""发布前必须审核")、事务边界;不 import `req`/`res`
- **dao**:仅 SQL 与行/列映射(snake_case → camelCase);不判断业务权限
- 禁止跨层调用(如 controller 直接用连接池)

## 4. zod 校验模式

每个模块一个 schema 文件;controller 用 `parse`/`safeParse`;失败统一转 400,message 含具体字段。

```ts
// src/validators/knowledge.schema.ts
import { z } from 'zod';

export const knowledgeQuerySchema = z.object({
  keyword: z.string().trim().max(50).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const knowledgeCreateSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100),
  categoryId: z.coerce.number().int().positive('分类不能为空'),
  content: z.string().trim().min(1, '正文不能为空'),
  source: z.string().trim().min(1, '来源不能为空'),        // source 必填(简报第 4 节)
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  effectiveUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

## 5. 参数化 SQL 规则(红线)

- 一切查询用 mysql2 占位符 `?` 传值;`pool.query(sql, params)`。
- 模糊查询把通配符放进参数:`title LIKE CONCAT('%', ?, '%')`,**禁止** `'%'+keyword+'%'` 拼接。
- **禁止**拼接用户输入进 SQL 字符串;**禁止**动态表名/列名/排序字段来自请求(排序白名单映射)。
- 使用连接池(`mysql2/promise.createPool`),不手动建连接散落各处。

```ts
// src/dao/knowledge.dao.ts
import { pool } from '../config/db';
import type { KnowledgeQuery } from '../types/knowledge';

const ORDER_WHITE: Record<string, string> = { updated: 'updated_at', created: 'created_at' };

export async function findMany(q: KnowledgeQuery) {
  const where: string[] = ['status = ?'];
  const params: unknown[] = ['published'];
  if (q.keyword) {
    where.push('(title LIKE CONCAT(\'%\', ?, \'%\') OR content LIKE CONCAT(\'%\', ?, \'%\'))');
    params.push(q.keyword, q.keyword);
  }
  if (q.categoryId) { where.push('category_id = ?'); params.push(q.categoryId); }
  const orderCol = ORDER_WHITE[q.order ?? 'updated']; // 排序字段走白名单,不走用户输入
  const sql =
    `SELECT id, title, category_id AS categoryId, source, status,
            effective_until AS effectiveUntil, updated_at AS updatedAt
     FROM knowledge
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderCol} DESC
     LIMIT ? OFFSET ?`;
  params.push(q.pageSize, (q.page - 1) * q.pageSize);
  const [rows] = await pool.query(sql, params);
  return rows;
}
```

## 6. 统一错误处理

```ts
// src/utils/app-error.ts
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
```

```ts
// src/middlewares/error.middleware.ts(注册在所有路由之后)
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';
import type { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
  }
  logger.error(`${req.method} ${req.originalUrl}`, err); // 堆栈只进日志
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '系统繁忙,请稍后重试' } });
}
```

- controller 里 `try { ... } catch (err) { next(err) }`,或统一包一个 `asyncHandler`。
- zod 失败转 400:在 errorHandler 前挂一个 `zodErrorHandler`,把 `ZodError` 的 issue 拼成 `"标题不能为空"` 式 message。
- 数据库连不上(TC-10)也走 500 分支,**不得**把 `ECONNREFUSED`、host、用户名写进响应。

## 7. JWT 鉴权中间件

```ts
// src/middlewares/auth.middleware.ts
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/app-error';

export interface AdminPayload { adminId: number; username: string; role: string }

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return next(new AppError(401, 'UNAUTHORIZED', '未登录或凭证缺失'));
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET!) as AdminPayload;
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', '凭证无效或已过期'));
  }
}

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.admin?.role !== role) return next(new AppError(403, 'FORBIDDEN', '无权访问该资源'));
    next();
  };
}
```

- `/api/admin/*` 一律挂 `requireAuth, requireRole('admin')`——前端隐藏入口不算权限控制(TC-07)。
- `JWT_SECRET` 只放 `.env`;密码用 `bcryptjs.compare/hash`,登录响应不回传哈希。

## 8. 日志规范

- 统一 `config/logger`(简单封装 console + 可选文件即可),格式:`时间 级别 方法 路径 耗时 管理员ID`。
- error 级别必须记录堆栈与上下文,但**不记录**密码、token 全文、API Key。
- 每个请求建议挂一个耗时日志中间件,服务于"普通查询 2 秒内"的验收口径。

## 9. AI 组件(后端职责)

- `KnowledgeRetriever` 接口:默认实现 `LocalKbRetriever`(查自建库);预留 `HttpKbRetriever`,仅改配置切换。
- LLM 用 DeepSeek(`deepseek-chat`,OpenAI 兼容协议),适配器模式可切智谱/通义;`DEEPSEEK_API_KEY` 只放 `.env`。
- 降级:LLM 超时/异常 → 本地检索 + 模板化回答并明确提示;检索不到可信内容 → 提示"请核实",**禁止编造**。
- 用户输入只能进 user message,禁止拼进 system prompt(提示词注入防线)。
- 对话落 `ai_chat_session` / `ai_chat_message`,仅匿名 sessionId。详见 `ssda-ai-log`。

## 10. Jest + Supertest 测试组织

- 测试文件放 `backend/tests/`,命名 `<模块>.test.ts`;`app.ts` 导出 app,不监听端口,供 Supertest 直接调用。
- describe/it 用中文,带 TC 编号(见 `ssda-testing`);测试数据不得篡改 `db/seed.sql` 基线。
- 每条用例自备数据、用后清理;数据库相关用例可包事务回滚或使用独立测试库。

```ts
// tests/admin-auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('管理接口权限(TC-07)', () => {
  it('TC-07 未携带 token 调用管理接口:返回 401,服务端拒绝', async () => {
    const res = await request(app).get('/api/admin/knowledge');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
```

## 11. Do / Don't

**Do**

- 新接口先查 `ssda-api-contract` 并确认契约已登记
- 所有 SQL 参数化;排序/过滤字段走白名单
- 错误一律 `next(err)` 交给统一中间件;500 只回"系统繁忙"
- 管理接口 requireAuth + requireRole 双中间件
- 每完成一个节点更新 `docs/worklogs/worklog-<agent>.md`

**Don't**

- 禁止字符串拼接 SQL、禁止把 `req.query` 直接塞进 ORDER BY
- 禁止在 controller 写 SQL、在 dao 判断业务权限
- 禁止把堆栈、SQL、连接串、密钥写进响应;禁止明文/MD5 存密码
- 禁止提交 `.env`、禁止硬编码任何密钥
- 禁止使用 Node 22 不支持的 API(本地 v24 开发时尤其注意)

## 12. 冲突处理

本 skill 与 `docs/design/api-contract.md` 或简报冲突时,以契约/简报为准,并在完成报告中上报总控。契约变更提案一律不经由本 skill 执行。
