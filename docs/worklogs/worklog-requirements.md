# worklog — 需求与设计 Agent

## 任务书

- **角色**:需求与设计 Agent(受总控 Agent 调度)
- **日期**:2026-10-24

### 目标

基于 `docs/design/00-project-brief.md`(单一事实来源)与 `.zcode/skills/` 下相关规范,产出 SSDA 项目(新生校园知识库与入学事务辅助系统)的第一版设计文档四件套:API 契约 v1.0、系统设计、AI 组件设计、页面规格,并保证四份文档之间接口路径、状态枚举、字段名、分页默认值完全一致,FR-01~13 全部有接口/页面/测试追溯。

### 范围

- 需求条目(FR/US/M/P/TC)→ API 接口 → 页面 → 测试用例的追溯矩阵设计
- 系统架构、ER 图(11 实体)、核心时序图(≥4 张)、类图
- AI 对话链路设计(KnowledgeRetriever 检索 → DeepSeek 生成 → 降级兜底)与合规四性(可解释/鲁棒/公平/隐私)落地说明
- 页面路由表、页面交互与表单校验规则(对齐 TC-08 等)

### 允许改动的文件(仅限以下 5 个)

1. `docs/design/api-contract.md`(新建)
2. `docs/design/01-system-design.md`(新建)
3. `docs/design/02-ai-component-design.md`(新建)
4. `docs/design/03-page-spec.md`(新建)
5. `docs/worklogs/worklog-requirements.md`(本文件)

### 禁止事项

- 禁止修改代码、skills、00-project-brief.md、契约范围外的任何文件
- 禁止 npm/数据库操作
- 发现简报冲突:写入本 worklog 上报总控,不自行修改简报

### 预期产出

- 4 份中文设计文档(mermaid 图一律用代码块)
- 追溯矩阵:接口 ↔ FR(01~13) ↔ M(01~10) ↔ TC(01~10),FR-01~13 无遗漏
- 本 worklog 末尾完成报告

---

## 节点记录

### 节点 1:任务书已写,开始阅读必读材料(2026-10-24)

按顺序阅读:00-project-brief.md → ssda-requirements SKILL → ssda-api-contract SKILL。需求分析说明书2.0.docx 为原始需求参考,与简报冲突时以简报为准并上报。
另补读 ssda-ai-log / ssda-backend / ssda-frontend skill 以对齐落库字段、分层与页面命名;并核对 worklog-orchestrator 的已裁决事项(page=1/pageSize=10/上限 100、export 字段、降级模式先行)。

### 节点 2:契约 v1.0 完成(2026-10-24)

- 产出:`docs/design/api-contract.md`(版本记录、全局规范、公开接口 15 个、管理接口 19 组、AI 接口专节、追溯矩阵)
- 简报第 5 节接口全覆盖,另登记 6 个【补充】端点(课程/教师详情、管理端知识详情、任教关系×3)
- 状态流转定稿:draft→(submit-review)→pending_review→(review: publish/reject)→published/draft;published→(takedown)→takedown;published/takedown 编辑保存自动回退 draft(先审后发红线)
- 发现口径差异(待总控,不自行改 skill):
  1. 派单指定 400=VALIDATION_ERROR,ssda-api-contract skill 第 6 节示例为 INVALID_PARAM——契约为准,建议总控统一后修订 skill;
  2. 派单指定 AI 响应 `mode:"deepseek"|"fallback"`,ssda-api-contract 模板与 ssda-ai-log 导出示例为 `"llm"|"fallback"`——契约与导出格式均按 deepseek|fallback 编写,建议总控统一修订两个 skill 的示例;
  3. ssda-requirements skill 要求追溯矩阵放 `docs/requirements/requirements-traceability.md`,本次按派单边界写入 api-contract.md 第 5 节,建议总控授权后再建独立矩阵文件(或裁决以契约内嵌为准)。

### 节点 3:系统设计文档完成(2026-10-24)

- 产出:`docs/design/01-system-design.md`
- 内容:架构图(flowchart)、分层职责表、ER 图(erDiagram,11 实体/12 表全部字段 + 主外键 + 6 条业务约束注释)、4 张时序图(P02 搜索含 TC-02/03 分支、P04 发布含 TC-06/07/08 分支、P05 过期处理含 TC-09 展示规则、AI 链路含无检索/降级分支)、类图、NFR 落地表
- 定稿业务规则:published/takedown 编辑保存自动回退 draft(先审后发);学生端 takedown 详情返回 404;teacher 仅存公开字段;删除保护(409)与级联清理范围

### 节点 4:AI 组件设计文档完成(2026-10-24)

- 产出:`docs/design/02-ai-component-design.md`
- 内容:总体链路 flowchart(含三级兜底:无检索拒答 / LLM 超时降级 / Key 未配置直降级)、KnowledgeRetriever TS 接口签名与 LocalKbRetriever/HttpKbRetriever 两实现、system prompt v1 全文(注入防线:用户输入只进 user message)、DeepSeek 适配器参数(model=deepseek-chat、temperature=0.3、timeout 20s)、合规四性对照表、ai_chat_* 表与 JSONL 导出设计
- mode 取值统一为 `deepseek|fallback`(与契约一致,skill 示例差异已在节点 2 上报)
- 提示词存档路径约定 `docs/ai-logs/prompts/ai-chat-system-prompt-v1.md`,由后端 AI 模块 Agent 启用时落档(本文档不越界写该目录)

### 节点 5:页面规格文档完成(2026-10-24)

- 产出:`docs/design/03-page-spec.md`
- 内容:学生端 11 条 + 管理端 9 条路由表与守卫说明、全局组件(布局/AI 悬浮入口/StatusTag/ExpiredBanner/页脚数据来源声明)、逐页目标/API/交互/空态与状态规则、管理端表单校验规则表(与 zod 同口径,TC-08)、全端状态展示规则汇总表(TC-09/TC-10 口径)
- 交互约定:AI sessionId 存 `localStorage.ssda_ai_session_id`(与契约 4.3 一致);搜索页 query 带 keyword 可回跳

### 节点 6:自测(2026-10-24)

- **FR 覆盖检查**(契约追溯矩阵 + 全文 grep):FR-01~11、FR-13 均有接口与页面承载;FR-12 显式标注本期不做;TC-01~10 全部有接口/页面落点。覆盖计数:FR-01×3、FR-02×2、FR-03×1、FR-04×4、FR-05×15、FR-06×4、FR-07×1、FR-08×8、FR-09×2、FR-10×10、FR-11×5、FR-13×6;TC-01~10 均 ≥3 处引用。
- **跨文档一致性**:mode 取值(deepseek|fallback)、retriever(local_kb)、错误码(VALIDATION_ERROR 等 6 个)、分页默认(page=1/pageSize=10/上限 100)、状态四态、localStorage key(ssda_token/ssda_ai_session_id)、JSONL 导出字段在 4 份文档中逐项一致;无 INVALID_PARAM 残留;mermaid 均为代码块。
- **边界自查**:仅写入了授权的 5 个文件(4 份设计文档 + 本 worklog);未改代码/skills/简报;无 npm/数据库操作;需求分析说明书2.0.docx 未逐条解析(可选材料,以简报为唯一事实来源,如总控要求逐条对照再补做)。

---

## 完成报告(2026-10-24)

### 已完成

1. `docs/design/api-contract.md`(775 行):契约 v1.0,版本记录 + 冻结说明;全局规范(响应包/分页/camelCase/kebab-case/时间格式/错误码表含 409 CONFLICT);公开接口 15 个(简报第 5 节全覆盖)、管理接口 19 组(登录、知识 CRUD+提审/审核/下架、过期工作台、变更日志、6 类资源 CRUD、任教关系、AI 日志+导出);AI 对话接口专节(链路/状态对照/sessionId 约定);接口↔FR↔M↔TC 追溯矩阵。
2. `docs/design/01-system-design.md`(463 行):架构图、分层职责表、ER 图(11 实体/12 表全字段 + 主外键 + 6 条业务约束)、4 张时序图(P02/P04/P05/AI 链路,均含异常分支与 TC 标注)、类图、技术选型与 NFR 落地(含过期状态展示规则四条)。
3. `docs/design/02-ai-component-design.md`(156 行):总体链路(三级兜底)、KnowledgeRetriever TS 接口 + Local/Http 两实现、system prompt v1 全文与注入防线、DeepSeek 适配器(deepseek-chat/temperature 0.3/timeout 20s/降级)、合规四性对照、ai_chat_* 日志与 JSONL 导出设计。
4. `docs/design/03-page-spec.md`(185 行):路由表 + 守卫、全局组件、学生端 9 节/管理端 8 节页面规格、表单校验规则、状态展示规则汇总。

### 自测情况

- 见"节点 6":FR 覆盖无遗漏、TC 全落点、跨文档口径一致、写入边界合规。

### 遗留问题

1. 追溯矩阵按派单写在契约第 5 节;ssda-requirements skill 期望的独立文件 `docs/requirements/requirements-traceability.md` 未建(超出本次授权范围)。
2. 本任务自身属"AI 辅助开发",按 ssda-ai-log 轨道②应记 `docs/ai-logs/dev-usage-log.md`,但该路径不在授权清单,未写入。
3. 管理端列表页偶需地点下拉数据,页面规格采用 `GET /api/locations?pageSize=100` 方案,未新增字典专用接口(避免契约膨胀)。

### 需总控决策事项

1. **400 错误码定名**:派单与契约用 `VALIDATION_ERROR`,ssda-api-contract skill 第 6 节示例为 `INVALID_PARAM`——请裁决后统一修订 skill(契约为准是 skill 自身的冲突规则)。
2. **AI mode 取值**:契约/ER/页面均用 `deepseek|fallback`;ssda-api-contract 模板与 ssda-ai-log 导出示例为 `llm|fallback`——请裁决并修订两个 skill 示例,保证测试与导出统计口径一致。
3. **追溯矩阵落位**:是否授权建立 `docs/requirements/requirements-traceability.md`(内容可从契约第 5 节展开),或裁决"契约内嵌为准"并修订 ssda-requirements skill 第 4 节。
4. **TC 缺口增补**:FR-13(AI 问答)、FR-09(分类删除 409)、任教关系维护、AI 日志导出在 TC-01~10 无直接覆盖,建议测试 Agent 增补 TC-11+ 并登记映射表。
5. **ssda-frontend skill 页面清单修订**:路由 `/services/:id`、`/activities/:id` 需要 `ServiceDetailView`、`ActivityDetailView`,当前 skill 的 views 清单未列,请授权技能工程师补录。
6. **分页例外确认**:`GET /api/categories` 全量返回(导航字典)是契约登记的唯一分页例外,请总控冻结时确认。
7. 契约 v1.0 状态为"待总控评审冻结",评审通过后请由总控统一宣布冻结并同步全体 Agent。
