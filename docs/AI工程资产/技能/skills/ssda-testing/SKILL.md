---
name: ssda-testing
description: SSDA 项目测试与验收规范(Jest/Supertest + Vitest)。凡是编写或执行后端/前端自动化测试、维护 TC-01~TC-16 与自动化用例的映射表、执行阶段回归、编写测试报告、准备验收材料的任务,必须先使用本 skill;TC-01~TC-10 全覆盖是验收硬性条件(TC-11~TC-16 为项目补充用例,一并回归)。
---

# ssda-testing:测试与验收规范

目标读者:从未参与本项目的开发者/子 Agent。读完本文件,你应能按项目口径编写、组织、执行测试,并维护验收用例追溯。

## 1. 测试栈与运行方式(冻结)

- 后端:Jest + ts-jest + Supertest,测试代码在 `backend/tests/`;运行 `cd backend && npm test`
- 前端:Vitest + @vue/test-utils,测试代码在 `frontend/src/__tests__/`;运行 `cd frontend && npm test`
- 被测对象:后端 `src/app.ts` 导出的 Express 实例(不监听端口);前端组件整体 mount
- 组织细节与代码模式见 `ssda-backend` 第 10 节、`ssda-frontend` 第 8 节
- **runInBand 红线**:后端 `npm test` 固定 `jest --runInBand`(package.json 已固化)——各套件共用 `TCK-` 前缀标记清理数据,并行 worker 会互删彼此数据,**禁止**改并行执行;若新增套件,沿用 `TCK-` 前缀 + 各自清理的约定。
- **LLM 侧不打真实外网**:DeepSeek 相关分支用 `jest.spyOn(global, 'fetch')` mock(见 `backend/tests/ai-chat-llm.test.ts`,覆盖超时/非 2xx/畸形 JSON/空 choices),`DEEPSEEK_BASE_URL` 指向 127.0.0.1 未监听端口兜底;Key 未配置的 fallback 真实链路由 `ai-chat.test.ts` 实测,两套件互不依赖。

## 2. TC-01~TC-10 ↔ 自动化用例映射表(核心资产)

**正式映射表存放于 `docs/testing/TC用例映射表.md`**,由测试 Agent 建立并持续维护;下表为骨架,创建正式表时以简报 3.4 的"操作/预期"原文为准,路径可按实际实现微调,但**每个 TC 必须至少有一条自动化用例或显式注明"人工执行+原因"**。

> 现状(2026-10-24):正式表已建立,TC-01~TC-10 之外还登记了 **TC-11~TC-16 项目补充用例**(该文件"二、"节:AI 命中/拒答/降级落库、分类删除 409、任教关系维护、AI 日志导出),阶段回归时一并执行;TC-01~TC-10 全覆盖仍是验收硬性条件。

| TC | 操作(简报 3.4) | 预期(简报 3.4) | 后端自动化用例(建议) | 前端自动化用例(建议) | 状态 |
|---|---|---|---|---|---|
| TC-01 | 有效关键词搜索 | 返回相关结果及标题、分类摘要 | `backend/tests/search.test.ts` it('TC-01 …') | `KnowledgeListView.spec.ts` | 待实现 |
| TC-02 | 空关键词 | 提示输入关键词或展示默认列表,不异常 | `knowledge.test.ts`(keyword 缺省 200) | `KnowledgeListView.spec.ts` | 待实现 |
| TC-03 | 不存在的关键词 | 无匹配结果提示 | `search.test.ts`(返回空 list) | `KnowledgeListView.spec.ts`(el-empty) | 待实现 |
| TC-04 | 打开知识详情 | 展示正文、来源、更新时间、状态 | `knowledge.test.ts`(GET /api/knowledge/:id) | `KnowledgeDetailView.spec.ts` | 待实现 |
| TC-05 | 按分类筛选 | 结果仅含所选分类 | `knowledge.test.ts`(categoryId 过滤断言) | `KnowledgeListView.spec.ts` | 待实现 |
| TC-06 | 管理员新增知识 | 校验通过写入数据库,学生端按发布规则可查 | `admin-knowledge.test.ts`(登录→POST→学生端 GET) | `KnowledgeEditView.spec.ts` | 待实现 |
| TC-07 | 普通用户(未授权)调用管理接口 | 服务端拒绝 | `admin-auth.test.ts`(无 token 401 / 无角色 403) | `router.guard.spec.ts`(可选) | 待实现 |
| TC-08 | 录入缺标题/无效日期 | 拒绝保存并提示具体错误 | `admin-knowledge.test.ts`(400 + message 字段名) | `KnowledgeEditView.spec.ts`(rules) | 待实现 |
| TC-09 | 查看已过期知识 | 显示过期标识或隐藏已下架内容 | `knowledge.test.ts`(effectiveUntil 过期可见性) | `KnowledgeDetailView.spec.ts`(横幅) | 待实现 |
| TC-10 | 数据库连接不可用 | 友好错误提示,不泄露堆栈/凭据 | `error-middleware.test.ts`(mock dao 抛错→500) | `http.spec.ts`(错误提示) | 待实现 |

映射表维护规则:

- 新增/修改用例后**当天**更新 `docs/testing/TC用例映射表.md` 的"建议路径→实际路径、状态"列。
- 状态取值:待实现 / 已实现 / 已通过 / 失败(附原因链接)。
- 契约或需求变更导致预期变化时,不得私改简报与映射表的"操作/预期"列,上报总控。

## 3. 用例命名(Jest / Vitest 统一)

- `describe('模块或功能(关联TC)')`,`it('TC-xx 中文动作:中文预期')`。
- 断言响应包结构:`res.body.success`、`res.body.data`、`res.body.error.code`,与 `ssda-api-contract` 一致。

```ts
// backend/tests/knowledge.test.ts(节选)
import request from 'supertest';
import app from '../src/app';

describe('知识查询与详情(M02)', () => {
  it('TC-02 空关键词:返回默认列表,HTTP 200 且 success=true', async () => {
    const res = await request(app).get('/api/knowledge');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.list)).toBe(true);
  });

  it('TC-03 不存在的关键词:返回空列表而非 500', async () => {
    const res = await request(app).get('/api/knowledge?keyword=%E4%B8%8D%E5%AD%98%E5%9C%A8XXYYZZ');
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(0);
  });

  it('TC-09 已过期知识:详情可见时必须带过期状态标识', async () => {
    const res = await request(app).get('/api/knowledge/1');
    expect(res.status).toBe(200);
    expect(res.body.data.effectiveUntil).toBeDefined();
  });
});
```

```ts
// backend/tests/admin-auth.test.ts(节选,TC-07)
describe('管理接口权限(M08)', () => {
  it('TC-07 未携带 token:返回 401', async () => {
    const res = await request(app).get('/api/admin/knowledge');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('TC-07 携带非管理员角色 token:返回 403', async () => {
    const token = await getTestToken({ role: 'student' }); // 测试辅助函数,造测试账号
    const res = await request(app).get('/api/admin/knowledge').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
```

## 4. 测试环境初始化(每次回归前)

1. 确认 MySQL 8.0 服务(Windows 服务名 `MySQL80`)已启动。
2. 测试库初始化(连接配置走 `.env.test`,不入 git):

```bash
mysql -u root -p < db/schema.sql   # 重建表结构
mysql -u root -p < db/seed.sql     # 灌入基线数据
```

3. 需要的测试账号/令牌在用例内用辅助函数现造(注册→bcrypt 哈希→发 token),不写入 seed。

## 5. 回归流程(阶段验收前必做)

1. 按第 4 节初始化测试环境。
2. 后端全量:`cd backend && npm test`,记录通过/失败数。
3. 前端全量:`cd frontend && npm test`,记录通过/失败数。
4. 全部通过才算阶段回归通过;失败用例由对应负责 Agent 修复后**重跑全量**(不允许只跑单文件宣布通过)。
5. 把两次全量结果填入阶段测试报告(模板见第 7 节)。

## 6. 测试数据约定

- `db/seed.sql` 是全项目共享基线:**禁止在测试中修改、删除 seed 数据**;测试只新增自己的数据。
- 每条用例自造数据(工厂函数/fixture),`afterEach`/`afterAll` 清理;用例之间不依赖执行顺序。
- 不直连开发库/生产库;测试用独立数据库(如 `ssda_test`),连接配置走测试专用 `.env.test`。
- 断言"数据库写入"用 API 或 DAO 查询验证,不绕过应用直改数据再测。
- 管理端测试账号:测试环境专用,密码随机生成后 bcryptjs 哈希,不使用与开发/生产相同的凭据。

## 7. 测试报告模板

```markdown
# 测试报告 — <阶段名,如 Phase 3 功能实现>
- 执行时间:YYYY-MM-DD HH:mm
- 执行人:<Agent 名>
- 后端 Jest:共 N 条,通过 N,失败 N(jest --runInBand 输出摘要)
- 前端 Vitest:共 N 条,通过 N,失败 N
- TC 覆盖:TC-01~TC-10 中已自动化 N 条;人工 N 条(原因:…)
- 失败分析:每条失败一行——用例名 / 疑似原因 / 指派给谁
- 结论:阶段回归通过 / 不通过(阻塞项列表)
- 产出:docs/testing/test-report-<phase>.md
```

## 8. Do / Don't

**Do**

- 写用例前先看 `ssda-api-contract`(响应包)与对应模块 skill
- it 名称带 TC 编号,保证映射表可双向检索
- TC-06/TC-07/TC-08 这类跨登录-校验-权限的用例,按"登录→构造数据→断言→清理"完整链路写
- 每次回归后同步更新 `docs/testing/TC用例映射表.md` 与测试报告

**Don't**

- 禁止篡改 `db/seed.sql` 基线或在用例间共享可变状态
- 禁止断言错误堆栈、SQL 文本等不该出现在响应里的内容(TC-10 反向验证:断言响应**不含** `stack`、`ECONNREFUSED`、密码字段)
- 禁止用 sleep/超长 timeout 掩盖异步问题;禁止跳过(skip)失败用例而不记录原因
- 禁止在测试中提交 `.env.test` 之外的密钥文件

## 9. 协作约束

测试 Agent 按项目规范维护 `docs/worklogs/worklog-testing.md`;发现的缺陷不属于测试 Agent 修复范围时,在映射表"状态"列标记失败并在完成报告中列明,由总控分派。

> v1.1 2026-10-24:§1 补 jest --runInBand 红线与 LLM fetch-mock 测试模式(ai-chat-llm.test.ts 模式);§2 标注 TC用例映射表.md 已建立且 TC-11~TC-16 补充用例已登记;description 同步 TC-01~TC-16(总控指令,Phase 3 终版迭代)。
