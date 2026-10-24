---
name: ssda-api-contract
description: SSDA 项目的 API 契约与接口约定。凡是设计新接口、修改接口路径/参数/返回结构、定义错误码、前后端联调对齐响应格式,以及任何涉及 /api/ 路径命名的任务,必须先使用本 skill;新增或修改接口前"先登记 api-contract.md 再实现"是强制流程。
---

# ssda-api-contract:API 契约规范

目标读者:从未参与本项目的开发者/子 Agent。读完本文件,你应能写出与项目契约一致的接口定义与实现,并知道新增接口的正确流程。

## 1. 什么时候必须用本 skill

- 设计/新增/修改任何 `/api/*` 接口
- 定义请求参数、响应结构、错误码
- 前端对接后端接口(字段名、分页、错误处理对齐)
- 评审别人提交的接口实现是否符合契约

## 2. 唯一契约文件

- 契约文件:`docs/design/api-contract.md`(**当前版本 v1.1**:v1.0 Phase 1 冻结,v1.1 为阶段体检补登记,只增不删)。
- **子 Agent 没有直接修改契约的权限**(简报第 8 节)。需要新增/变更接口时:在自己的工作日志记录变更提案 → 完成报告中列出 → 由总控裁决并统一修订 api-contract.md → 之后才能实现。
- 本 skill 与契约冲突时,以 api-contract.md 为准并上报。

## 3. 响应包结构(全项目统一)

成功:

```json
{ "success": true, "data": { "list": [], "total": 0 } }
```

失败:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "标题不能为空" } }
```

硬性规则:

- 所有接口都返回这个结构,没有例外。
- `error.code` 为大写蛇形命名(UPPER_SNAKE);`error.message` 是可直接展示给用户的中文。
- 错误响应**不得泄露堆栈、SQL、连接串、凭据**;500 统一返回 `"系统繁忙,请稍后重试"`,详情只写服务端日志。

## 4. 路径与命名约定

| 项 | 约定 | 正例 | 反例 |
|---|---|---|---|
| 资源路径 | 名词**复数** | `/api/knowledge`、`/api/categories` | `/api/getKnowledge` |
| 资源详情 | `/:id` | `/api/knowledge/12` | `/api/knowledge?id=12`(仅限详情语义) |
| 多词路径段 | kebab-case | `/api/admin/knowledge/12/change-logs` | `/api/admin/knowledge/changeLogs` |
| 查询参数与 JSON 字段 | camelCase | `categoryId`、`pageSize` | `category_id`、`page_size` |
| 管理接口 | `/api/admin` 前缀 + JWT 保护 | `/api/admin/knowledge` | `/api/knowledgeAdmin` |
| 动作型端点 | 仅登录/AI 对话等动词场景 | `POST /api/admin/auth/login`、`POST /api/ai/chat` | `POST /api/admin/doDelete` |

数据库列名用 snake_case(如 `category_id`),仅在 DAO 层出现;返回给前端的 JSON 一律 camelCase,转换放在 DAO/Service 层。

## 5. 分页约定

- 请求:`page`(从 1 开始)、`pageSize`(默认 10,上限 100);筛选参数如 `keyword`、`categoryId`。
- 响应:`data = { list, total, page, pageSize }`。
- 列表类接口**必须分页**,禁止一次返回全表。

## 6. HTTP 状态码语义(冻结)

| 状态码 | 语义 | 示例 |
|---|---|---|
| 200 | 成功 | 任何正常返回 |
| 400 | 参数错误,`error.message` 含具体字段信息 | 缺标题、日期格式非法(TC-08) |
| 401 | 未登录 / token 无效 | 管理接口未带 token(TC-07) |
| 403 | 已登录但角色未授权 | 非管理员调管理接口(TC-07) |
| 404 | 资源不存在 | `/api/knowledge/999` |
| 500 | 服务器异常,统一"系统繁忙",详情仅写日志 | 数据库不可用(TC-10) |

业务错误码推荐(首次登记契约时按此表):

`VALIDATION_ERROR`(400)、`UNAUTHORIZED`(401)、`FORBIDDEN`(403)、`NOT_FOUND`(404)、`CONFLICT`(409)、`INTERNAL_ERROR`(500);业务态可扩展如 `KNOWLEDGE_EXPIRED`。(总控裁决 2026-10-24:统一 VALIDATION_ERROR,废弃 INVALID_PARAM)

## 7. 当前项目接口清单(概要,细节以 api-contract.md 为准;契约冻结至 v1.1)

**公开接口(无需登录)**

- `GET /api/health` 健康检查
- `GET /api/categories` 分类列表
- `GET /api/knowledge` 知识列表(page/pageSize/keyword/categoryId)
- `GET /api/knowledge/:id` 知识详情
- `GET /api/services` 办事指南;`GET /api/activities` 活动
- `GET /api/locations` 地点;`GET /api/locations/:id` 地点详情(v1.1 补登记)
- `GET /api/courses` 课程;`GET /api/courses/:id` 课程详情(含任教教师与上课地点)
- `GET /api/teachers` 教师;`GET /api/teachers/:id` 教师详情(含任教课程与答疑时间)
- `GET /api/search` 聚合搜索(多类型结果 + 类型筛选)
- `POST /api/ai/chat` AI 问答(仅匿名 sessionId,不收集个人身份;`mode: "deepseek" | "fallback"`)

**管理接口(JWT 保护)**

- `POST /api/admin/auth/login` 登录(返回 token)
- `/api/admin/knowledge` CRUD + 审核 + 上下架
- `/api/admin/{categories,services,activities,locations,courses,teachers}` 各资源 CRUD;其中 **services/activities/courses/teachers 另有 `GET /:id` 单条详情(v1.1 补登记,编辑回显在用)**
- `GET /api/admin/knowledge/expired` 过期信息工作台(响应含 `daysRemaining` 距过期天数,v1.1)
- `GET /api/admin/knowledge/:id/change-logs` 修改日志
- `GET /api/admin/ai-logs` AI 对话记录(`?export=1` 导出)

## 8. 契约条目模板(写进 api-contract.md 的格式)

```markdown
### POST /api/ai/chat
- 权限:公开(匿名 sessionId)
- 请求:{ "sessionId": "string(uuid)", "message": "string(1~500)" }
- 响应 data:{ "answer": "string", "sources": [ { "type", "id", "title", "source", "updatedAt" } ], "mode": "deepseek" | "fallback", "retriever": "local_kb" }
- 错误:400 VALIDATION_ERROR(消息为空/超长);500 INTERNAL_ERROR
- 关联需求:FR-13;验证用例:见 ssda-testing 映射表
```
(总控裁决 2026-10-24:字段名 answer、mode 取值 deepseek|fallback——mode 记录生成引擎身份,满足课程 AI 日志"标注使用哪个工具"要求;以 api-contract.md 为准)

## 9. 最小代码示例(与契约一致的 Express 实现)

```ts
// src/controllers/knowledge.controller.ts
import { NextFunction, Request, Response } from 'express';
import { knowledgeQuerySchema } from '../validators/knowledge.schema';
import * as knowledgeService from '../services/knowledge.service';

export async function listKnowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const q = knowledgeQuerySchema.parse(req.query); // 失败抛 ZodError → 400
    const { rows, total } = await knowledgeService.list(q);
    res.json({ success: true, data: { list: rows, total, page: q.page, pageSize: q.pageSize } });
  } catch (err) {
    next(err); // 交给统一错误中间件,绝不在此处直接返回堆栈
  }
}
```

## 10. 联调自查清单(前后端对不上时先查这里)

- [ ] 前端请求的路径、方法与契约逐字一致(复数资源、`/api` 前缀)
- [ ] 请求参数名 camelCase,分页用 `page` / `pageSize`,不是 `pageNum` / `limit`
- [ ] 响应拦截器已按 `success` 解包;组件拿到的是 `data`,不是整个 body
- [ ] 错误分支处理了 401(清 token 跳登录)、403(提示无权限)、400(展示 `error.message`)
- [ ] 数据库 snake_case 列名已在 DAO 层映射为 camelCase 返回
- [ ] 新增接口已先登记 `docs/design/api-contract.md`(登记流程见第 2 节)

## 11. Do / Don't

**Do**

- 实现前先对照 api-contract.md;契约未定义的接口一律先走登记流程
- 路径用复数名词、多词段 kebab-case、字段 camelCase、分页 page/pageSize/total
- 400 的 message 写明具体字段(如"effective_until 不是合法日期")
- 每个 401/403/404 场景对齐第 6 节语义

**Don't**

- 禁止私改契约文件,禁止"边写代码边定接口"
- 禁止返回裸数组作为顶层响应(必须包 success/data)
- 禁止在响应中出现 stack、SQL、连接串、密钥
- 禁止用 GET 做写操作、用 POST 做纯查询

## 12. 协作约束

实现接口的任务须同步维护 `docs/worklogs/worklog-<agent>.md`;涉及契约变更的提案写进完成报告,交总控裁决。相关规范见 `ssda-backend`(实现)、`ssda-frontend`(对接)、`ssda-testing`(验证)。

> v1.1 2026-10-24:§2 标注契约当前版本 v1.1(冻结,补登记只增不删);§7 接口清单同步 v1.1 的 5 个详情端点(公开 `GET /api/locations/:id` + 管理端 services/activities/courses/teachers 的 `GET /:id`)、`daysRemaining` 字段与 `mode` 双模式取值(总控指令,Phase 3 终版迭代;既有裁决注记未改动)。
