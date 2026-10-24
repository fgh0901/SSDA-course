# 测试与审计 Agent 工作日志 — 阶段体检

- Agent:ssda-tester(角色定义 .zcode/agents/ssda-tester.md)
- 执行时间:2026-10-24
- 任务来源:总控派发的阶段体检(全量回归 + 接口实测 + 三方对齐 + 代码审计 + AI 对话质量专项)

## 任务书

1. 任务 A 全量回归:backend / frontend 各跑 lint、test、build,记录原文摘要。
2. 任务 B 接口功能实测:对 3000 端口真实服务用 node fetch 冒烟,覆盖公开接口 15 个 + 管理流 + AI 对话。
3. 任务 C 三方接口对齐表:frontend/src/api/*.ts ↔ docs 契约 ↔ backend/src/routes。
4. 任务 D 代码审计:按 ssda-code-audit 清单 P0~P3 逐项核对,产出 docs/audits/code-audit-report.md。
5. 任务 E AI 对话回答规范性专项:≥6 个实测问题 + 设计承诺核对,产出 docs/test/ai-chat-quality-report.md。

## 边界

- 只读代码、不修复缺陷、不碰 .env/契约/skills、不 git 操作、不 kill 用户启动的 3000 服务。
- 产出仅:docs/test/functional-test-report.md、docs/test/api-alignment-report.md、docs/audits/code-audit-report.md、docs/test/ai-chat-quality-report.md + 本 worklog。

## 节点

- [x] 节点 0:加载 ssda-testing / ssda-code-audit skill,建立 worklog
- [x] 节点 1:环境确认(node v24.19.0;/api/health 200 db=up)
- [x] 节点 2:任务 A 全量回归 — backend lint 0 问题、test 13 套件 104 用例全过、build 通过;frontend lint 0 问题、test 7 文件 40 用例全过、build 通过(有 >500kB chunk 警告,记 P3)
- [x] 节点 3:任务 B 接口功能实测 — 117 项检查,111 通过;真实异常 2 个(任教关系删除非法参数返回英文 zod 原文;8 字短问句 AI 检索漏检误拒答),6 个首轮 FAIL 均系脚本自身 bug 已补测澄清
- [x] 节点 4:任务 C 三方对齐 — 前端 59 个接口函数 ↔ 后端路由全部对上,无"按钮调了不存在的 api";后端仅 1 个契约外端点(GET /api/locations/:id)+ 4 个契约未明示的 admin 详情 GET
- [x] 节点 5:任务 D 代码审计 — P0=0,P1=1(JWT_SECRET 代码默认值,实测线上已覆盖),P2=4(CORS 全开/seed 弱口令/AI 落库阻塞/检索短句漏检),P3=6;SQL 注入/越权/密码/信息泄露/XSS/提示词注入红线全部通过
- [x] 节点 6:任务 E AI 对话质量 — 14 用例实测:拒答/来源/mode/不编造/不泄露/不收 PII 全合规;2 项质量改进(短问句漏检、排序噪声)+ 前端降级提示条与设计承诺逐条核对(18 项中 15 项完全符合、3 项半符合/预留)
- [x] 节点 7:产出四份报告(docs/test/functional-test-report.md、docs/test/api-alignment-report.md、docs/audits/code-audit-report.md、docs/test/ai-chat-quality-report.md)

## 任务 2:TC-11+ 登记(总控追加,2026-10-24)

- 任务书:建立 docs/testing/tc-mapping.md(ssda-testing skill 第 2 节要求的正式映射表,此前缺失);保留 TC-01~10 骨架,新增 TC-11~16 六条补充用例并对应到既有自动化测试文件与用例名;TC-12 措辞按"检索不到可信内容时拒答"定义(不锁定具体问句,兼容后端修复 Agent 正在进行的检索质量修复);只写 tc-mapping.md 与本 worklog,不改代码不跑测试。
- 节点:
  - [x] 节点 8:grep 读取 backend/tests 与 frontend/src/__tests__ 全部 describe/it 用例名(只读)
  - [x] 节点 9:编写 docs/testing/tc-mapping.md(TC-01~10 实名映射 + TC-11~16 新增登记)
- 产出:docs/testing/tc-mapping.md
- 完成说明:
  - TC-01~10 骨架按 skill 原文保留(操作/预期列),映射到实际用例文件与用例名,状态全部"已通过"(2026-10-24 全量回归 backend 104/104、frontend 40/40)。
  - 新增 TC-11~16 六行(来源分别登记为契约矩阵备注 3:TC-11/12/13;备注 2:TC-14/15/16),用例名逐字取自现有测试代码。
  - TC-12 按"检索不到可信内容时拒答"定义,以"检索无命中/isReliable=false"为判定依据,不锁定具体问句,兼容进行中的检索分词质量修复(审计 A-05)。
  - 备注:部分后端用例名尚无 TC-xx 前缀(ai-chat.test.ts 等),映射表已挂接并留维护建议,未改任何代码。
- 未跑测试、未改代码,仅新增 docs/testing/tc-mapping.md 与本 worklog 更新。

## 完成报告

### 回归结果
- backend:lint 0 问题;test 13 套件 104 用例全过;build 通过。
- frontend:lint 0 问题;test 7 文件 40 用例全过;build 通过(主 chunk 1,094.78 kB 超限警告,P3)。

### 接口实测异常清单(发现即记录,未修复)
1. DELETE /api/admin/courses/1/teachers/abc → 400 `{"message":"Invalid input: expected number, received NaN"}`(契约 1.1 要求中文;根因 course.controller.ts:190-193 id 缺中文 message,admin.routes.ts:88-91 未用 validate 中间件)。P3。
2. POST /api/ai/chat "校园跑有什么要求?"(恰 8 字)→ 误拒答(sources=[]),而知识库存在对应条目;根因 local-kb-retriever.ts:91 的 2~8 字分段不分词。契约行为合规(不编造),属质量缺陷 P2。
3. 观察项:AI 对"校园卡丢了怎么补办?"的 top-1 是"校园跑打卡规则说明",排序有噪声(P3,建议接入 LLM 后仍关注)。
- 其余 111 项全部符合契约:状态机(draft→pending_review→published→takedown→回退 draft)、409 冲突(分类/地点/课程/教师/任教关系/非 draft 删除)、分页/筛选/404/400、expired 工作台、change-logs、ai-logs 查询与 JSONL 导出、六资源 CRUD、任教关系全链、AI 边界(500/501/600 字、UUID、空串)。

### 三方对齐结论
- 前端 59 个接口函数与后端路由/契约三方一致,无"前端有调用后端没实现";28 个 .vue 事件绑定全部有定义。
- 后端多出:GET /api/locations/:id(契约外,前端未用,建议补登记或下线);admin 四资源详情 GET(契约未明示,前端在用,建议补登记)。
- 学生端知识列表多返回 status/createdAt 字段(契约未列,无害,P3)。

### 审计发现(按级别)
- P1×1:A-01 env.ts:14 JWT_SECRET 硬编码默认值(新环境漏配可伪造 admin token;实测当前线上 401 已覆盖真实密钥,当前不可利用)。
- P2×4:A-02 cors() 全开;A-03 seed 弱口令 admin/admin123 且 README 无改密提示;A-04 AI assistant 落库失败会 500(违设计 6.3);A-05 检索 8 字短句漏检(同实测异常 2)。
- P3×6:A-06 英文 zod 报错文案;A-07 契约外 locations/:id;A-08 admin 详情 GET 未登记;A-09 列表多返回字段;A-10 前端孤儿导出 toCategoryPayload;A-11 前端 chunk 超 500kB。
- 红线全部通过:SQL 注入(全参数化+CONCAT+硬编码 ORDER BY)、越权(guarded.use(requireAdmin) 统一挂载+401/403 区分)、密码(bcrypt+响应无哈希)、信息泄露(500 统一话术)、.env 未入 git(git ls-files 只读验证)、XSS(无 v-html/innerHTML)、AI 提示词注入(user message 隔离)。

### AI 对话质量结论
- 合规全通过:命中类附来源且来源 id 可跳转、检索不到明确"请核实"且 sources 空、mode 如实标 fallback、注入攻击不泄露、PII 不复述、匿名 sessionId、话术通顺专业。
- 前端 AiChatView 降级提示条(AiChatView.vue:104-111)按 mode 渲染正确,sources router-link 可点击;与 02 设计 18 项承诺核对:15 项完全符合、3 项半符合(落库兜底/HttpKbRetriever 占位/DeepSeek 适配器 Phase 3 未实装)。
- 改进建议 5 条见 docs/test/ai-chat-quality-report.md 第四节(含 Key 就绪后补测 deepseek 真实链路的验收清单建议)。

### 需总控决策事项
1. GET /api/locations/:id 补契约登记或下线;admin 四资源详情 GET 补登记。
2. docs/testing/tc-mapping.md 尚未建立(目录不存在),TC 映射正式登记需建文件(本任务按"只产出 4 份报告"约束未创建,建议下任务补)。
3. P1(A-01)与 P2(A-02~A-05)修复分派;修复后复审 + 重跑全量回归与 AI 用例集。
