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

---

## 任务 2:体检修复(总控指令)

- [2026-10-24] 任务书(执行人:ssda-backend-dev;依据 code-audit-report.md A-01/A-02/A-04/A-05/A-06 与 ai-chat-quality-report.md 建议 1/2/4):
  1. **F1[P1]** `backend/src/config/env.ts` JWT_SECRET 去掉 `.default(...)`,缺失/过短时启动即报错(fail fast);tests/env.setup.ts 已设置不破坏现有测试;.env.example 保留占位说明并注明必填。
  2. **F2[P2]** `backend/src/ai/retriever/local-kb-retriever.ts`:①2~8 字分段整句保留参与匹配,同时追加 2-gram 兜底(修复 8 字短问句"校园跑有什么要求?"误拒答);②打分引入"查询词覆盖率"权重(命中查询中不同词更多者优先),整句命中加权,降低单 2-gram 高频噪声(校园卡问句 top1 不再被校园跑条目抢占)。新增测试:短问句命中非拒答、校园卡 top1、无关短问句仍拒答。
  3. **F3[P2]** `backend/src/ai/chat-service.ts` assistant 消息落库包 try/catch,失败记 error 日志仍返回回答(02-ai-component-design 6.3:落库失败不阻塞响应);mock 落库抛错场景测试。
  4. **F4[P3]** 校验错误文案中文化 + 统一 validate 中间件:course.controller.ts removeRelation 内联 zod 改 idParamSchema/relationId 路径参数 schema(中文 message);admin.routes.ts 关系删除路由补 validate('params');search/expired/change-logs 三处控制器内联 zod 抽到 validators 并改路由级 validate 中间件;确保全接口 400 message 中文。测试:DELETE /api/admin/courses/1/teachers/abc → 400 且中文。
  5. **F5[P2]** CORS 收敛:env.ts 增 `CORS_ORIGIN`(默认 http://localhost:5173,逗号分隔多个);app.ts cors 白名单;.env.example 同步;测试跨域放行/拒绝行为。
- 验收口径:`npm run lint`、`npm test`(104+新增全过)、`npm run build` 全绿;不碰 frontend/、契约、skills、.gitignore;不 git 操作;MySQL 仅用 ssda/ssda_test。

### 任务 2 执行记录(2026-10-24)

- **F1[P1] JWT_SECRET 必填**:`src/config/env.ts` 去掉 `.default('ssda-dev-secret-change-me-please')`,改 safeParse + 抛错并指明字段(fail fast);`tests/env.test.ts` 3 用例(缺失即抛/少于 16 字符即抛/合法配置正常解析,以 jest.mock 屏蔽 .env 精确模拟漏配);`.env.example` 注明必填语义。tests/env.setup.ts 原有设置不受影响。
- **F2[P2] 检索短句漏检与排序噪声**:`src/ai/retriever/local-kb-retriever.ts` 重构 tokenize → analyzeQuery:①2~8 字分段整句保留为 strongTerm(命中 ×2 加权)且所有 ≥3 字分段切**重叠 2-gram(步长 1)**;②打分 = (标题×3+正文×1,整句词×2)×(1+查询词覆盖率)+已核实×1+有效期内×1。**根因修正**:原步长 2 非重叠 2-gram 把"丢了/补办"等词边界全部切丢(实测得到"了怎/么补"),是排序噪声的真正来源;重叠切分后"园卡/补办"等判别性词参与打分,校园卡条目 16.29 vs 校园跑 6.57(实测调试脚本,已删除)。测试 4 用例:tokenize 单元断言、8 字短问句命中非拒答、校园卡 top1、无关短问句仍拒答。
- **F3[P2] 落库失败不 500**:`src/ai/chat-service.ts` assistant 落库包 try/catch,失败 console.error 后仍返回回答(02 设计 6.3);测试 2 用例:jest.spyOn(aiLogDao,'insertMessage') 仅对 assistant 抛错、user 透传真实落库,断言 200+回答完整、DB 仅 user 消息。
- **F4[P3] 校验中文化 + 统一中间件**:`course.controller.ts` removeRelation 内联 zod 改 `validated(res,'params')`;`validators/course.schema.ts` 新增 courseTeacherParamsSchema(id 复用 idParamSchema 中文文案);admin.routes.ts 关系删除路由补 validate('params');search/expired/change-logs 三处控制器内联 zod 抽出(`validators/search.schema.ts` 新建、knowledge.schema.ts 增 expiredQuerySchema、change-logs 走 paginationSchema)全部改路由级 validate 中间件;common.schema.ts 增 Pagination 类型。测试 2 用例:DELETE /api/admin/courses/1/teachers/abc → 400 中文(断言不含 zod 英文原文)、id 非数字 → 400 "id 必须为数字"。
- **F5[P2] CORS 收敛**:`env.ts` 增 CORS_ORIGIN(默认 http://localhost:5173,逗号分隔);`app.ts` cors({ origin: 白名单数组 });`.env.example` 同步;`tests/cors.test.ts` 4 用例(白名单放行/多 origin/非白名单无 ACAO 头/预检 204 放行与拒绝)。
- **验收**:`npm run lint` ✅、`npm test` 15 套件 119 用例(104+15 新增)全绿 ✅、`npm run build` ✅。未触碰 frontend/、契约、skills、.gitignore;未 git 操作;MySQL 仅用 ssda_test(测试数据自备用后清理);3000 端口用户自启服务未受影响。
- **上报总控**:①02-ai-component-design.md 2.1 打分公式已按任务指令引入覆盖率权重与整句加权(设计文档未改,存在口径漂移,建议下轮同步);②审计 A-03(admin 默认口令提示)、A-07~A-11 均属总控裁决/前端/文档范围,未处理。

---

## 任务 3:Phase 3 DeepSeek 适配器(总控指令)

- [2026-10-24] 任务书(执行人:ssda-backend-dev;唯一设计依据 docs/design/02-ai-component-design.md §1 链路/§3 提示词/§4 适配器参数;DEEPSEEK_API_KEY 用户暂缺,真实 HTTP 无法联调,全部以 `jest.spyOn(global,'fetch')` mock 覆盖):
  1. **C1 DeepSeekAdapter 实装(OpenAI 兼容)**:`POST {DEEPSEEK_BASE_URL}/chat/completions`,Headers `Authorization: Bearer ${DEEPSEEK_API_KEY}`、`Content-Type: application/json`;body `{ model: DEEPSEEK_MODEL(默认 deepseek-chat), messages[system,user], temperature 0.3, max_tokens 600, stream false }`(max_tokens 600 按 02 设计 §3.2/§4 补齐,任务书正文未列);AbortController + LLM_TIMEOUT_MS(默认 20000)超时按失败;解析 choices[0].message.content,非 2xx/网络错误/空内容/JSON 结构异常一律抛 LlmError 由 ChatService 降级;保持 llm/types.ts 签名,工厂 index.ts 逻辑不变(Key 已配置→DeepSeekAdapter,否则 NullLlmAdapter)。
  2. **C2 ChatService 双模式复核**:isReliable=false 不调 LLM(拒答红线,sources=[]);isReliable=true 调 LLM,成功 mode='deepseek'、失败(超时/异常/空文本)降级 mode='fallback' 并记日志;注入防线:system = system prompt v1 全文 + 资料编号块(资料非用户输入,允许进 system),user message 仅用户原文(与 02 设计 §3.1 一致,无口径冲突);sources 返回并落库,latency=检索+生成总耗时。
  3. **C3 新增测试 ≥7(fetch mock)**:①Key 已配置+LLM 200 → mode='deepseek'/answer=mock 文本/sources 非空/请求体含 Authorization+model+temperature/system 含资料编号/user 仅问题;②超时(AbortController)→降级;③500/畸形 JSON/空 choices →降级;④Key 未配置→fetch 不被调用走降级;⑤拒答路径 fetch 不被调用 sources=[];⑥注入文本仅出现在 user message;⑦latency_ms 落库有值 ≥0。
  4. **C4 验收**:lint/test(119+新增)/build 全绿;小步两笔提交(adapter 一笔;双模式测试一笔),各自只 add backend/ 与本 worklog;.env 不提交。
- 边界:只写 backend/ 与本 worklog;不碰 frontend/、db/、skills;不 git push;MySQL 仅用 ssda/ssda_test;3000 端口运行中服务不受影响(tsx watch 热载属预期)。
- 已知事实:jest 以 --runInBand 串行;现有 ai-chat.test.ts 16 用例(任务 2 后共 119)不得破坏。

### 任务 3 执行记录(2026-10-24)

- **C1 DeepSeekAdapter 实装**(`src/ai/llm/deepseek-adapter.ts`):OpenAI 兼容 `POST {DEEPSEEK_BASE_URL}/chat/completions`(去尾部斜杠),Headers `Authorization: Bearer` + `Content-Type: application/json`;body `{model: env.DEEPSEEK_MODEL, messages[system,user], temperature 0.3, max_tokens 600, stream:false}`(max_tokens 600 按设计 §3.2/§4 补齐);AbortController + `LLM_TIMEOUT_MS`(默认 20s)超时(finally 清 timer);解析 `choices[0].message.content`,非 2xx/网络错误/空内容/JSON 结构异常一律抛 `LlmError`;`src/ai/llm/index.ts` 仅更新注释,工厂逻辑未变。
- **C2 ChatService 双模式复核:零代码改动**。Phase 2 既有 `src/ai/chat-service.ts` 已完整满足:isReliable=false 不调 LLM 拒答(sources=[]);isReliable=true 调 LLM,成功 mode='deepseek',LlmError/其他异常均降级 mode='fallback' 并 console.warn 记日志;assistant 落库复用既有 try/catch 不阻塞;latency_ms=检索+生成总耗时。**注入防线落位决策**:system message = system prompt v1 全文 + 资料编号块(资料为服务端已发布数据,允许进 system),user message = 用户原文逐字透传——与 02 设计 §3.1 描述完全一致,无口径冲突,无需偏离红线。
- **C3 测试(共新增 10 条,≥7 达标)**:
  - 新建 `tests/ai-chat-llm.test.ts`(9 条):LLM 200(mode/answer/sources + URL/Authorization/Content-Type/model/temperature/stream/max_tokens 请求契约)、消息组装(system 含 [1] 与条目标题、user 仅原文)、超时(fetch mock 挂起至 AbortController 真实中止)、HTTP 500、畸形 JSON(json 抛 SyntaxError)、choices 空、拒答红线(Key 已配置仍不调 LLM)、注入防线(注入文本仅在 user message,system 保持 v1 原文)、deepseek 模式落库 latency_ms≥0。
  - `tests/ai-chat.test.ts` 追加 1 条:Key 未配置 → fetch 不被调用走降级(独立 SESSION_NOKEY,不影响既有 total 断言)。
  - 文件级 Key 注入机制:`tests/helpers/llm-env.ts` 作为测试文件**首个 import** 在 env.ts 求值前注入"Key 已配置"(顶层副作用,ES import 提升导致普通语句不可靠);DEEPSEEK_BASE_URL 指向 127.0.0.1:59999(mock 失效也仅本地快速失败,绝不打外网);LLM_TIMEOUT_MS=500 便于超时用例;afterAll 恢复 env,防止 --runInBand 同进程泄漏到后续文件。
  - 过程修正:注入问句最初把注入文本放在句首,长问句 2-gram 轮询合并总量上限(12)截断了靠后的 KB 关键词 → 检索零命中误走拒答;改为真实问题在前、注入文本在后(注入语义不受语序影响,注入目标相对 user message 恒为"以上指令")。
- **C4 验收**:`npm run lint` ✅、`npm test` **16 套件 129 用例**(119+10)全绿 ✅、`npm run build` ✅。MySQL 仅用 ssda_test(globalSetup 重建,数据用后清理);frontend/、db/、skills、契约未触碰;未 push。
- **提交纪律执行**:C1 一笔 `feat(ai): implement deepseek adapter (openai-compatible, timeout, abort)`(43bd215);C2+C3 一笔(见 git log,仅 backend/tests×3 与本 worklog;.env 未提交)。
- **上报总控**:
  1. **真实联调待 Key**:HTTP 分支已全部由 fetch mock 覆盖且代码就绪,Key 就绪后仅改 `backend/.env` 即启用,无需再改代码;建议届时跑一次真实冒烟(校验 base_url/模型名/配额)。
  2. **"Key 未配置"用例的环境依赖**:该用例依赖 `.env` 中 `DEEPSEEK_API_KEY` 为空的现状(已注释标注);日后配置真实 Key 后该用例需按工厂新行为同步调整。
  3. **提交信息计数**:任务书预设 "(+7 tests)",实际新增 10 条,按事实写为 "(+10 tests)",如需严格照抄预设文案可一笔 amend。
  4. **设计文档路径出入(未改文档)**:02 设计 §2/§4 注释路径为 `backend/src/services/ai/...`,实际实现位于 `backend/src/ai/...`(Phase 2 既有结构);请总控下轮同步文档。
  5. **测试运行口径**:AI 两套件与其他套件共用 `TCK-` 前缀清理,必须以 `npm test`(即 `jest --runInBand`)运行;并行 worker 下 beforeAll/afterAll 互删数据会大面积误报(实测确认,属既有 MARK 清理机制的固有约束,非本次引入)。
