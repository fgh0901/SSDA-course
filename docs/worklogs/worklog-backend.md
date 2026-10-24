# 后端工程师任务书与工作日志

- Agent:后端工程师(backend-dev)
- 日期:2026-10-24
- 角色定义:.zcode/agents/ssda-backend-dev.md

## 任务书

### 目标
按契约 v1.0(逐字对照)完成后端全部接口 + 数据库脚本 + AI 对话降级模式全链路 + 自动化测试,保持 lint/test/build 全绿。

### 交付物
1. `db/schema.sql` + `db/seed.sql`(仓库根 db/ 目录),实际导入验证
2. 后端全部接口(契约 2.x 公开接口 / 3.x 管理接口 / 4.x AI 接口)
3. AI 对话接口 POST /api/ai/chat(降级模式全链路,LocalKbRetriever,DeepSeek 适配器仅预留接口)
4. Jest + Supertest 测试覆盖(含 TC-07/08/09/10)

### 边界
- 只写 backend/、db/、本 worklog;不碰 frontend/、契约、skills;不 git 操作
- MySQL 只允许 ssda / ssda_test 两个库
- 契约疑问写入 worklog 并在最终报告标注,不改契约

## 节点记录

- [2026-10-24] 任务书创建完成;盘点现状:backend 脚手架(app.ts/index.ts/config/middlewares/utils/tests)已存在,db/ 目录为空,待读契约后开工。
- [2026-10-24] 【里程碑 1:数据库脚本】产出 `db/schema.sql`(12 张表,utf8mb4/InnoDB,主外键/唯一约束/CHECK(knowledge 有效期止≥起、活动止≥始),knowledge 标题+正文前缀索引,(category_id,status)、(status,effective_until) 组合索引,全表含 created_at/updated_at 与列注释)+ `db/seed.sql`(管理员 admin 唯一明文凭据仅文件内注明;6 分类;46 条知识覆盖 published 有效期内/已过期/pending_review/draft/takedown 五态,source 全部标注"(示例数据)";14 地点;11 教师(仅公开字段);9 课程+12 任教关系;10 办事指南;8 活动;6 条变更日志示例)。实际导入 MySQL 8.0.44 成功无外键报错,数据分布校验通过。
- [2026-10-24] 【里程碑 2:后端全部接口】分层完成 validators(10 个 zod schema)/dao(10 个,全参数化 SQL + LIKE CONCAT 占位符 + 排序白名单)/services(11 个)/controllers(11 个)/routes(public/admin/ai 三组装配);契约 2.x 公开接口、3.x 管理接口(知识 CRUD+submit-review+review+takedown+expired 工作台+change-logs、六资源 CRUD、任教关系 3 端点、ai-logs 查询+?export=1 JSONL)全部实现;知识状态机按契约 3.4~3.9(先审后发、仅草稿可删、409 冲突)。health 改为探测 db 返回 up/down。修复:idParamSchema 校验源从 query 改为 params 的缺陷。
- [2026-10-24] 【里程碑 3:AI 降级链路】src/ai/retriever(types+LocalKbRetriever:六表已发布内容检索,分词去停用词,打分=标题×3+正文×1+已核实×1+在期内×1,top-5+阈值)/src/ai/llm(types+DeepSeekAdapter 预留不发起 HTTP+NullLlmAdapter 工厂)/src/ai/chat-service(会话惰性建→user 消息先落库→检索→无可信内容拒答 sources=[]→有内容走降级模板 mode=fallback→assistant 落库 sources_json/mode/retriever/latency_ms);POST /api/ai/chat 冒烟通过(命中 sources=5、未命中拒答、400 校验);src/scripts/export-ai-logs.ts + package.json export:ai-logs 实测导出 12 条/降级率 50%。冒烟脏数据已清理。
- [2026-10-24] 问题记录:①Git Bash 的 curl -d 发送中文按 GBK 编码导致服务端收到乱码(冒烟误判检索为空),改用 UTF-8 文件体后确认链路正常——测试一律用 Supertest(Node 层 UTF-8)规避;②repo 根 .gitignore 是否已含 docs/ai-logs/exports/ 需总控确认(本 Agent 不越界修改)。
- [2026-10-24] 【里程碑 4:测试与验收】tests/global-setup.js 每轮用 mysql2 对 ssda_test 执行 db/schema.sql 重建表结构(不含 seed,数据自备);13 个测试套件 104 用例全绿,describe/it 中文带 TC 编号,覆盖 TC-01~TC-10 与 AI 专项(降级链路/落库断言/导出/隐私红线);jest 配置 forceExit(mysql2 连接池持句柄)。修复:①controller 内 zod parse 抛 ZodError 误入 500 → error.ts 统一 ZodError→400(TC-08 口径);②z.enum/管道组合下自定义错误消息位置;③测试清理 SQL 的 mysql2 数组展开需嵌套参数。验收:lint ✅ build ✅ test 13/13 套件 104/104 用例 ✅ dev 服务 GET /api/health 返回 db:"up" ✅ ssda 库数据保持 seed 基线 46 条、冒烟脏数据已清理,ssda_test 用后清零。

## 完成报告

### 已完成
1. **数据库脚本**(仓库根 db/):schema.sql(12 表/utf8mb4/InnoDB/主外键+唯一约束+CHECK/知识标题正文索引/全表 created_at+updated_at+列注释,幂等 DROP+CREATE)+ seed.sql(admin/admin123 唯一明文仅文件注明;6 分类;46 知识覆盖五态;14 地点;11 教师仅公开字段;9 课程+12 任教;10 指南;8 活动;6 变更日志)。实际导入 MySQL 8.0.44 成功无外键报错。
2. **公开接口(契约 2.x)**:health(含 db 探测)、categories(全量例外)、knowledge 列表/详情(仅 published,含 isExpired 服务端计算)、services(+/:id)、activities(+/:id,time 筛选)、locations、courses(+/:id)、teachers(+/:id)、search 聚合(六类分组,type 筛选)。
3. **管理接口(契约 3.x)**:login(bcrypt+JWT 12h)、knowledge CRUD+submit-review+review+takedown+expired 工作台(expired/expiring/daysOverdue/daysRemaining)+change-logs(全部动作落日志);categories/services/activities/locations/courses/teachers 六资源 CRUD(重名 400、被引用 409、教师 zod strict 拒绝隐私字段);任教关系 3 端点;ai-logs 查询+?export=1 JSONL 文件流。状态机:先审后发(published/takedown 编辑回退 draft)、仅 draft 可删、takedown→pending_review 可重新上架。
4. **AI 对话(契约 2.15/4.x,降级全链路)**:src/ai/retriever(KnowledgeRetriever 接口+LocalKbRetriever:仅已发布内容、分词去停用词、打分=标题×3+正文×1+已核实×1+在期内×1、top-5、阈值 1、过期条目 snippet 带"(已过期)")、src/ai/llm(LlmAdapter 接口+DeepSeekAdapter 预留不发起 HTTP+NullLlmAdapter 工厂按 DEEPSEEK_API_KEY 选择)、src/ai/chat-service(会话惰性建→user 先落库→检索→无可信内容拒答 sources=[]→有内容降级模板 mode=fallback→assistant 落库 sources_json/mode/retriever/latency_ms;用户输入只进检索参数与 user message,注入防线);src/scripts/export-ai-logs.ts + npm run export:ai-logs(实测 12 条/降级率 50%)。
5. **测试**:13 套件 104 用例全绿;globalSetup 重建 ssda_test;TC-01~TC-10 全覆盖(映射见测试文件内 TC 编号)。
6. **验收**:`npm run lint` ✅、`npm test` 13/13 套件 104/104 ✅、`npm run build` ✅、dev 服务 GET /api/health → `{status:"ok",db:"up",time:"2026-10-24 18:35:41"}` ✅、schema+seed 导入 ✅。

### 产出路径
- db/schema.sql、db/seed.sql
- backend/src:app.ts(改造)、config/db.ts(改造:helpers+dateStrings+事务)、middlewares(validate.ts/error.ts 改造)、utils/datetime.ts、utils/text.ts、validators×10、dao×10、services×11、controllers×11、routes×3、ai/(retriever×3+llm×3+chat-service)、scripts/export-ai-logs.ts
- backend/tests:global-setup.js、helpers.ts、health/categories/knowledge/services/activities/locations/courses-teachers/search/admin-auth/admin-knowledge/admin-crud/ai-chat/error-middleware.test.ts(13 个)
- backend/package.json(+export:ai-logs 脚本)、jest.config.js(+globalSetup/forceExit)
- docs/worklogs/worklog-backend.md(本文件)

### 遗留问题与需总控决策事项
1. **契约疑点(未改契约)**:契约 2.3 示例 summary 末尾带"…",实现为截断 80 字后统一追加省略号(仅超长时);契约 3.19 导出行仅含 6 字段(role=user 时 mode 为 null),已按契约实现,前端需容忍 null。
2. **repo 根 .gitignore**:需确认已含 `docs/ai-logs/exports/`(本次冒烟实测导出样例 `ai-chat-export-20261024-1758.jsonl` 已生成于该目录,不入 git 由 .gitignore 兜底;本 Agent 不越界修改)。
3. **docs/ai-logs/dev-usage-log.md(轨道②)**:按 ssda-ai-log 规范本阶段开发过程 AI 使用记录需登记台账,超出本 Agent 文件边界,请总控/知识工程师登记(本 worklog 已含对应节点可引用)。
4. **AI 专项测试用例编号**:契约追溯矩阵备注 3 建议 AI 问答专项用例登记为 TC-11+(提请总控裁决);当前已在 ai-chat.test.ts 以"AI 对话降级全链路"命名覆盖(检索命中/未命中拒答/降级/落库/导出/隐私)。
5. **DeepSeek 适配器**:按任务要求 Phase 2 不实现 HTTP 调用,已预留 src/ai/llm 接口与工厂;Key 配置后 chat-service 无需改动即可在 Phase 3 接入(届时 DeepSeekAdapter.chatCompletion 实装 HTTP)。
6. **jest forceExit**:mysql2 连接池持有 TCP 句柄,afterAll 数据清理已完成,进程退出用 forceExit;后续如引入连接池显式关闭可移除。
