---
name: ssda-code-audit
description: SSDA 项目代码安全与质量审计规范。凡是执行代码审计/评审/安全检查,阶段合并前验收,以及检查 SQL 注入、越权、密码存储、信息泄露、XSS(v-html)、.env 入 git、AI 提示词注入等高风险项的任务,必须先使用本 skill,并按 P0~P3 严重级别与审计清单产出审计报告。
---

# ssda-code-audit:代码审计规范

目标读者:从未参与本项目的开发者/子 Agent。读完本文件,你应能按统一级别定义和清单执行审计,并产出可直接决策的审计报告。

## 1. 什么时候必须用本 skill

- 每个 Phase 代码合并 main 之前的例行审计
- 涉及登录/权限/SQL/AI 组件的代码合入前专项审计
- 复核他人修复后的返工验证
- 编写审计报告

## 2. 严重级别定义(P0~P3)

| 级别 | 定义 | 处置要求 |
|---|---|---|
| **P0 致命** | 可直接被利用的安全漏洞或秘密泄露 | 立即修复,**禁止带 P0 合并 main**;修复后须复审 |
| **P1 高危** | 权限/校验/注入防线缺失,暂无直接利用路径但风险明确 | 本阶段内必须修复,阻塞阶段验收 |
| **P2 中危** | 质量与健壮性缺陷,影响验收口径(如 2 秒响应)或可维护性 | 列入下阶段计划,报告中跟踪 |
| **P3 低危** | 风格、命名、注释、轻微性能问题 | 建议,不阻塞 |

级别判定示例:SQL 字符串拼接 = **P0**;明文密码 = **P0**;`.env` 入 git = **P0**;管理接口漏挂 role 中间件 = **P1**;响应含堆栈 = **P1**;列表不分页 = **P2**;命名不一致 = **P3**。

## 3. 审计清单(逐项勾选,逐文件核对)

### 3.1 SQL 注入(P0 红线)

- [ ] 全库 grep 拼接特征:`query(` 附近出现 `` `...${ ``、`+ req.`、`+ keyword` 等
- [ ] 所有 SQL 通过 mysql2 占位符 `?` 传参,无一处字符串拼接用户输入
- [ ] 模糊查询用 `CONCAT('%', ?, '%')`,不是 `'%'+kw+'%'`
- [ ] ORDER BY / 表名 / 列名来自白名单,不直接取请求参数

### 3.2 越权(P0/P1)

- [ ] 所有 `/api/admin/*` 路由均挂 `requireAuth` + `requireRole('admin')` 双中间件(P1;完全裸奔则 P0)
- [ ] 401(未登录)与 403(无角色)语义区分正确(TC-07)
- [ ] 详情/更新/删除接口校验资源归属,不依赖前端传来的可信 id
- [ ] 前端路由守卫仅作体验优化,不存在"只靠前端隐藏入口"的接口

### 3.3 密码(P0 红线)

- [ ] bcryptjs 哈希存储,无明文、无 MD5/SHA1
- [ ] 登录与用户查询响应不含 `password` / `password_hash` 字段
- [ ] seed/测试账号密码不与真实凭据相同,README 提示默认账号需修改

### 3.4 信息泄露(P0/P1)

- [ ] 500 响应统一"系统繁忙,请稍后重试",堆栈只进服务端日志(TC-10)
- [ ] 响应不含 SQL 语句、连接串、host、端口、内部路径
- [ ] 400/404 的 message 不暴露表名、列名、第三方 SDK 细节

### 3.5 敏感配置(P0 红线)

- [ ] `.env` 在 `.gitignore` 中;仓库与提交历史中只有 `.env.example`
- [ ] `DEEPSEEK_API_KEY`、`JWT_SECRET`、DB 密码均出自环境变量,代码零硬编码
- [ ] 日志不打印 token 全文、API Key、密码

### 3.6 XSS(P1)

- [ ] 前端无 `v-html`;确需富文本时先经 sanitize 白名单净化
- [ ] 知识正文、AI 回答、用户搜索词等不可信内容只走文本插值
- [ ] 检查 `innerHTML`、`domProps`、动态 `:href`(`javascript:` 协议)

### 3.7 AI 提示词注入(P1)

- [ ] 用户输入只放入 user message,**禁止拼接进 system prompt**
- [ ] 回答基于 `KnowledgeRetriever` 检索结果并附来源(可解释),检索不到时提示"请核实"而非编造
- [ ] LLM 超时/异常走降级模板回答并明确提示(鲁棒)
- [ ] 仅使用匿名 sessionId,不收集个人身份(隐私);不做用户画像(公平)

### 3.8 其他(一般为 P2/P3)

- [ ] 列表接口全部分页(page/pageSize/total),无全表返回
- [ ] 错误日志含上下文但无敏感字段
- [ ] zod 校验覆盖全部写接口,400 message 含字段信息(TC-08)
- [ ] 常用查询条件(分类、状态、有效期)有索引,支撑 2 秒响应口径
- [ ] CORS 收敛到 `http://localhost:5173`,非 `*`

## 4. 审计方法(快速有效)

1. 定范围:`git diff main...feature` 或指定目录;先审鉴权与 DAO,再审 AI 与前端渲染。
2. 机械化筛查优先:grep `query(`、`v-html`、`password`、`eval(`、`fs.`、`localStorage`(token 之外禁止存敏感信息)。
3. 逐条走 3.x 清单,证据写"文件:行号",不要写"大概没有"。
4. 每个发现定级、给可执行的修复建议;P0/P1 给出复现方式。

## 5. 审计报告模板

存放:`docs/audits/audit-<阶段>-<日期>.md`。

```markdown
# 代码审计报告 — <阶段/范围>
- 审计时间:YYYY-MM-DD
- 审计人:<Agent 名>
- 审计范围:commit abc123..def456(backend/src, frontend/src)
- 结论:通过 / 不通过(P0 x 个,P1 x 个)

## 发现列表
| 编号 | 级别 | 位置 | 问题 | 证据 | 修复建议 | 状态 |
|---|---|---|---|---|---|---|
| A-01 | P0 | backend/src/dao/knowledge.dao.ts:42 | SQL 拼接 keyword | `...WHERE title LIKE '%${keyword}%'` | 改占位符 CONCAT('%', ?, '%') | 待修复 |
| A-02 | P1 | backend/src/routes/admin.ts:8 | /api/admin/teachers 漏挂 requireRole | 路由定义截图/摘录 | 补 requireAuth + requireRole('admin') | 待修复 |

## 清单勾选结果
- 3.1 SQL 注入:未通过(1 项)……
- 3.2 越权:通过……

## 复审记录(修复后追加)
- A-01 已修复,commit xxx,复审通过
```

## 6. 最小示例(审计发现对照)

```ts
// 反例(P0):keyword 直接拼接 → 必须写进审计报告
const sql = `SELECT * FROM knowledge WHERE title LIKE '%${keyword}%'`;
await pool.query(sql);

// 正例:参数化 + 通配符在参数中
const sql = 'SELECT id, title FROM knowledge WHERE title LIKE CONCAT(\'%\', ?, \'%\')';
await pool.query(sql, [keyword]);
```

```ts
// 反例(P1):只验登录不验角色,任何持有 token 的用户都能调用
router.delete('/api/admin/knowledge/:id', requireAuth, deleteKnowledge);

// 正例:登录 + 角色双重校验(TC-07 依赖)
router.delete('/api/admin/knowledge/:id', requireAuth, requireRole('admin'), deleteKnowledge);
```

## 7. Do / Don't

**Do**

- 每个发现附"文件:行号 + 代码摘录"证据
- P0/P1 明确阻塞动作(禁止合并 / 阻塞验收),并在完成报告单独列出
- 修复后必须复审并更新报告"复审记录"

**Don't**

- 禁止因"课程项目、内网使用"而放低 P0/P1 级别——红线就是红线
- 禁止只报告不给修复建议;禁止把 P2 写成 P0 制造恐慌
- 禁止审计者顺手修改业务代码(审计与开发分离);确需修复由总控分派

## 8. 协作约束

审计 Agent 维护 `docs/worklogs/worklog-<agent>.md`;报告存放 `docs/audits/`;对契约或简报相关的风险(如需要新增安全依赖)只提建议,由总控裁决。
