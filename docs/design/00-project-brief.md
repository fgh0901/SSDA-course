# SSDA 项目简报(Project Brief)v1.0

> 本文件是全体 Agent 的统一事实来源。任何 Agent 开工前必读;与需求书冲突时以 `需求分析说明书2.0.docx` 为准,与本文冲突时报告总控裁决。

## 1. 项目概述

- **项目名称**:新生校园知识库与入学事务辅助系统的设计与实现
- **课程背景**:《软件系统设计与应用》课程设计,2026—2027 学年第 1 学期(要求:软件工程 + AI,系统内集成至少一个 AI 组件,体现 AI 特殊需求,每阶段提交 AI 使用日志)
- **项目目标**:集中管理新生常用的校园教学、地点、办事、活动信息;支持分类浏览、关键词检索、详情展示(含来源/更新时间/有效期/核实状态);提供管理员后台维护能力;集成 AI 问答组件(知识库检索收敛回答范围)
- **本期不做**:收藏(US-10)、学生账号、在线报名、支付、教务系统对接、统一身份认证、地图导航

## 2. 技术决策(已冻结,变更须经总控)

| 项 | 决策 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Vue Router + Pinia + Axios |
| 后端 | Node.js(本地 v24,CI v22,代码须兼容 Node 22)+ Express + TypeScript + mysql2(参数化查询,禁字符串拼接 SQL) |
| 校验 | zod(后端入参校验,统一错误响应) |
| 鉴权 | JWT(jsonwebtoken)+ bcryptjs 密码哈希;管理接口服务端强制校验角色 |
| 数据库 | MySQL 8.0(本机服务名 MySQL80,root 需密码,连接串走 .env);初始化脚本 `db/schema.sql` + `db/seed.sql` |
| 测试 | 后端 Jest + ts-jest + Supertest;前端 Vitest + @vue/test-utils |
| AI 生成 | DeepSeek API(`deepseek-chat`,OpenAI 兼容协议;`DEEPSEEK_API_KEY` 走 .env 不入 git;适配器可切智谱/通义) |
| AI 检索 | `KnowledgeRetriever` 接口:默认 `LocalKbRetriever`(查自建库)+ 预留 `HttpKbRetriever`(外部知识库,仅改配置) |
| 降级 | LLM 超时/异常 → 本地检索 + 模板化回答并明确提示;检索不到可信内容 → 提示"请核实",禁止编造 |
| 端口 | 后端 3000,前端 5173(Vite proxy `/api` → `http://localhost:3000`) |
| 响应包 | `{ "success": true, "data": ..., }` / `{ "success": false, "error": { "code": "...", "message": "..." } }`;错误不泄露堆栈与凭据 |
| Git | feature 分支开发,阶段完成本地提交合并 main,不推远程 |

## 3. 需求条目(提炼自需求分析说明书 2.0)

### 3.1 功能需求 FR

| 编号 | 描述 | 优先级 |
|---|---|---|
| FR-01 | 按分类展示校园知识 | 高 |
| FR-02 | 按关键词搜索知识,空关键词提示 | 高 |
| FR-03 | 知识详情:标题、正文、来源、更新时间、状态 | 高 |
| FR-04 | 办事指南查询:部门、地点、时间、材料、流程 | 高 |
| FR-05 | 课程、教师及关联地点查询 | 高 |
| FR-06 | 活动查询:时间、地点、报名方式、适用对象 | 高 |
| FR-07 | 管理员身份验证,管理接口仅授权角色可访问 | 高 |
| FR-08 | 管理员知识 CRUD,必填字段校验 | 高 |
| FR-09 | 知识分类维护 | 中 |
| FR-10 | 知识状态与有效期,过期/待核实提示 | 高 |
| FR-11 | 保存知识来源与最近更新时间 | 高 |
| FR-12 | 收藏(本期不做) | 低/不做 |
| FR-13 | AI 问答(本期做:DeepSeek + 知识库检索收敛) | 扩展→本期必做 |

### 3.2 业务功能模块 M01~M10

| 编号 | 模块 | 关键功能点 | 涉及表 |
|---|---|---|---|
| M01 | 知识分类浏览 | 分类列表/详情/筛选/启用停用 | knowledge_category |
| M02 | 知识查询与详情 | 列表/详情/来源/更新时间/状态展示 | knowledge |
| M03 | 办事指南管理与查询 | 校园卡、水卡补办、宿舍报修、网络故障等 CRUD+查询 | service_guide, location |
| M04 | 活动信息管理与查询 | 校园跑、太极拳等活动维护+查询 | campus_activity, location |
| M05 | 地点查询 | 按校区/建筑/楼层/房间/名称检索 | location |
| M06 | 课程与教师查询 | 课程/教师/任教关系/办公室/答疑时间 | course, teacher, course_teacher, location |
| M07 | 关键词检索与筛选 | 标题关键词/分类筛选/分页/无结果提示/聚合搜索 | 多表 |
| M08 | 管理员登录与权限 | 登录/角色校验/受保护接口/退出/未授权拦截 | admin_user |
| M09 | 后台维护与审核 | 知识 CRUD/审核/状态管理/必填校验 | knowledge 及业务表 |
| M10 | 有效期与更新追踪 | 有效期/过期识别/待核实状态/来源/修改日志 | knowledge, knowledge_change_log |

### 3.3 主业务流程 P01~P05(要点)

- P01 学生浏览分类→知识详情(空数据显示空状态)
- P02 学生搜索办事信息(关键词校验→检索→列表→详情;无结果提示改关键词)
- P03 学生查课程/教师/地点(关联查询;未录入课表不得推断)
- P04 管理员维护并发布知识(登录→验证→CRUD→校验→审核→发布→学生端可见)
- P05 管理员核实并处理过期信息(筛选过期/临期→核实→更新/下架→学生端按新状态展示;未经核实不得自动标记真实有效)

### 3.4 验收测试用例 TC-01~10(测试 Agent 必须全覆盖映射)

| 编号 | 操作 | 预期 |
|---|---|---|
| TC-01 | 有效关键词搜索 | 返回相关结果及标题、分类摘要 |
| TC-02 | 空关键词 | 提示输入关键词或展示默认列表,不异常 |
| TC-03 | 不存在的关键词 | 无匹配结果提示 |
| TC-04 | 打开知识详情 | 展示正文、来源、更新时间、状态 |
| TC-05 | 按分类筛选 | 结果仅含所选分类 |
| TC-06 | 管理员新增知识 | 校验通过写入数据库,学生端按发布规则可查 |
| TC-07 | 普通用户(未授权)调用管理接口 | 服务端拒绝 |
| TC-08 | 录入缺标题/无效日期 | 拒绝保存并提示具体错误 |
| TC-09 | 查看已过期知识 | 显示过期标识或隐藏已下架内容 |
| TC-10 | 数据库连接不可用 | 友好错误提示,不泄露堆栈/凭据 |

### 3.5 非功能需求(验收口径)

- 普通查询 2 秒内返回;管理接口服务端权限校验;密码不明文;SQL 参数化
- 数据库异常友好提示,不暴露堆栈;前后端分层,命名一致,提供 DB 初始化脚本
- Chrome/Edge 最新两个大版本;信息注明来源与核实时间;未知信息标"待核实",不得伪造
- AI 组件合规:可解释(答案附来源)、鲁棒(降级)、公平(不做用户画像)、隐私(仅匿名 sessionId,不收集个人身份)

## 4. 数据模型(11 张表,Phase 1 出 ER 图与完整 DDL)

knowledge_category、knowledge、location、teacher、course、course_teacher、service_guide、campus_activity、admin_user、knowledge_change_log、ai_chat_session、ai_chat_message(后两张为 AI 日志,算一组共 11 个实体)。

关键约束:knowledge.status ∈ {draft, pending_review, published, takedown};有效期字段 effective_from/effective_until;source 必填;所有表含 created_at/updated_at;外键 + 唯一约束按 Phase 1 设计文档。

## 5. API 概要(Phase 1 冻结完整契约 docs/design/api-contract.md)

- 公开:GET /api/health、/api/categories、/api/knowledge(分页+keyword+categoryId)、/api/knowledge/:id、/api/services、/api/activities、/api/locations、/api/courses、/api/teachers、/api/search(聚合)、POST /api/ai/chat
- 管理(JWT):POST /api/admin/auth/login;/api/admin/knowledge CRUD+审核+上下架;/api/admin/{categories,services,activities,locations,courses,teachers} CRUD;GET /api/admin/knowledge/expired;GET /api/admin/knowledge/:id/change-logs;GET /api/admin/ai-logs(?export=1 导出)
- 状态码语义:200 成功;400 参数错误(含具体字段信息);401 未登录;403 未授权;404 不存在;500 统一"系统繁忙",详情仅写日志

## 6. 前端页面清单

学生端(/):首页(搜索+分类导航+最新知识)、知识列表(分类筛选+关键词+分页+状态标签)、知识详情(来源/更新时间/状态/过期横幅)、办事指南列表+详情、活动列表+详情、地点查询、课程教师查询(双 Tab)、聚合搜索结果页(类型筛选)、AI 助手对话页+全局悬浮入口
管理端(/admin,路由守卫):登录、知识管理(列表+编辑表单:状态/有效期/来源必填校验)、分类管理、办事指南管理、活动管理、地点管理、课程教师管理、过期信息工作台、AI 对话记录查看

## 7. 项目本地 Skills 规格(技能工程师按此创建)

存放位置:`D:\SSDA\.zcode\skills\<name>\SKILL.md`(frontmatter 含 name 与 description,description 写清"何时必须使用本 skill")。内容要求:给"从未参与过本项目的开发者/子 Agent"看也能一次做对;含规范、目录约定、命名、do/don't、最小代码示例;与本简报引用一致。

| skill 名 | 服务的 Agent | 内容大纲 |
|---|---|---|
| ssda-requirements | 需求与设计 | 需求条目编号体系(FR/US/M/P/TC)、追溯矩阵写法(设计→FR→TC 双向)、验收标准措辞、文档产出模板与存放路径 |
| ssda-api-contract | 后端+前端 | 响应包结构、路径命名(资源复数、kebab-case query)、分页参数(page/pageSize/total)、错误码表、字段命名(camelCase)、新增接口的契约登记流程(必须先改 api-contract.md 再实现) |
| ssda-backend | 后端 | 分层职责(routes→controllers→services→dao)、目录结构、zod 校验模式、参数化 SQL 规则、统一错误处理、JWT 中间件、日志规范、Jest+Supertest 测试组织 |
| ssda-frontend | 前端 | 目录结构(views/components/api/stores/router)、组合式 API + `<script setup lang="ts">`、组件命名(PascalCase+多词)、Pinia store 规范、axios 封装与响应包解包、Element Plus 使用约定、路由与守卫、Vitest 组件测试组织 |
| ssda-testing | 测试审计 | TC-01~10 ↔ 自动化用例映射表维护规则、Jest/Vitest 命名(describe/it 中文描述)、回归流程(全量 npm test 前后端)、测试数据约定(seed 数据不篡改)、测试报告模板 |
| ssda-code-audit | 测试审计 | 审计清单:SQL 注入(拼接=高危)、越权(管理接口必须过 JWT+role 中间件)、密码(明文=高危)、信息泄露(堆栈/凭据/SQL 进响应)、XSS(v-html 禁用清单)、.env 入 git=高危、AI 提示词注入(用户输入不得拼接进系统提示)、产出审计报告模板与严重级别定义 |
| ssda-ai-log | 全体 | AI 对话日志双轨制:①系统内对话落 ai_chat_* 表;②开发过程 AI 使用日志(docs/ai-logs/dev-usage-log.md,按阶段记:工具/目的/提示词要点/产出/人工修改);`npm run export:ai-logs` 导出格式 |

## 8. 监控与协作规范(全体 Agent 遵守)

1. 每个 Agent 在 `docs/worklogs/worklog-<agent>.md` 维护日志:开工写**任务书**(目标/范围/允许改动的文件/预期产出),过程按节点追加(时间戳+做了什么+产出路径+问题决策),结束写**完成报告**(结果/自测情况/遗留问题)。
2. 子 Agent 不修改契约文档与其他 Agent 的文件;需要变更契约时,在完成报告中提出,由总控裁决并统一修订。
3. 跨 Agent 唯一事实来源:`docs/design/00-project-brief.md`(本文件)+ `docs/design/api-contract.md` + 本地 skills。
4. 报告格式:结构化列出(已完成/产出物路径/未完成及原因/需要总控决策的事项)。
