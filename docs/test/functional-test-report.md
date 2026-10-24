# 功能测试报告 — 阶段体检(全量回归 + 接口实测)

- 执行时间:2026-10-24 23:11~23:30
- 执行人:ssda-tester(测试与审计 Agent)
- 被测对象:
  - 全量回归:backend / frontend 工作区源码(jest --runInBand / vitest run)
  - 接口实测:http://localhost:3000(用户启动的真实服务,种子数据已导入,未重启未杀进程)
- 实测脚本:node fetch 冒烟脚本(临时目录 C:\Users\30485\AppData\Local\Temp\ssda-smoke\,不入 git)

## 一、任务 A:全量回归(全部通过)

| 项 | backend | frontend |
|---|---|---|
| lint(npm run lint) | **通过,0 错误 0 警告**(eslint . 无输出,退出码 0) | **通过,0 错误 0 警告**(退出码 0) |
| test | **13 个套件 / 104 条用例全部通过**(Tests: 104 passed, 104 total;Time 15.8s)。输出中有 error-middleware 用例打印的错误堆栈日志,属用例预期(mock dao 抛错被 errorHandler 记日志),非失败 | **7 个文件 / 40 条用例全部通过**(Test Files 7 passed; Tests 40 passed;Duration 12.24s) |
| build(npm run build) | **通过**(tsc 无输出,退出码 0) | **通过**(vite build ✓ built in 8.74s;有警告:主 chunk 1,094.78 kB > 500 kB,建议 manualChunks 分包,记 P3) |

## 二、任务 B:接口功能实测

结果总览:**117 项检查,111 项通过,2 项异常(1 项确认缺陷、1 项质量缺陷),4 项备注(脚本序差已补测澄清)**。
- 首轮 90 项:PASS 80 / FAIL 7 / NOTE 3。7 个 FAIL 中 6 个经查为**测试脚本自身缺陷**(A-35 先删除了地点导致教师创建级联失败;AI 长度用例实际只发了 381 字),已用修正脚本补测并通过(P-04R、F-01~F-11)。
- 真实异常仅 2 个:F-12(报错文案为英文 zod 原文,契约偏差)与"校园跑有什么要求?"漏检拒答(检索质量,详见 ai-chat-quality-report.md)。

### 2.1 公开接口(契约第 2 节,15 个全覆盖)

| # | 请求要点 | 实际响应要点 | 判定 |
|---|---|---|---|
| P-01 | GET /api/health | 200 `{status:ok, db:up, time}` | 符合契约 2.1 |
| P-02 | GET /api/categories | 200 全量 6 条,含 id/name/description/sortOrder/isEnabled | 符合 2.2(分页唯一例外) |
| P-03 | GET /api/knowledge 缺省 | 200 `{list,total:35,page:1,pageSize:10}` | 符合 2.3 |
| P-04 | GET /api/knowledge?keyword=校园卡 | 200 命中 6 条;其中"2026 级新生报到流程指南"标题/摘要不含关键词,经详情复核**正文命中** | 符合(keyword 覆盖 title/content);排序相关性欠佳记入 AI 质量报告 |
| P-05 | ?categoryId=1 | 200 全部项 categoryId=1 | 符合 2.3 |
| P-06 | ?page=2&pageSize=3 | 200 page=2、pageSize=3、len=3 | 符合 1.2 |
| P-07 | ?page=0 | 400 VALIDATION_ERROR "page 必须 ≥1" | 符合 |
| P-08 | ?pageSize=101 | 400 VALIDATION_ERROR | 符合(上限 100) |
| P-09 | GET /api/knowledge/999999 | 404 NOT_FOUND "知识不存在或未发布" | 符合 2.4 |
| P-10 | GET /api/knowledge/:id(published) | 200 含 content/source/status/isExpired=false | 符合 2.4 |
| P-11 | GET /api/services | 200 total=10,list 项含 location 对象 | 符合 2.5 |
| P-12 | GET /api/services/:id | 200 含 materials/process | 符合 2.6 |
| P-13 | GET /api/services/999999 | 404 "办事指南不存在或已停用" | 符合 |
| P-14 | GET /api/activities | 200 total=8 | 符合 2.7 |
| P-15 | ?time=upcoming | 200 全部 startTime 晚于当前 | 符合 |
| P-16 | ?time=bogus | 400 "time 取值非法,应为 upcoming 或 past" | 符合 |
| P-17 | GET /api/activities/999999 | 404 | 符合 |
| P-18 | GET /api/locations | 200 total=14 | 符合 2.9 |
| P-19 | ?campus=主校区 | 200 全部 campus=主校区 | 符合 |
| P-20 | ?keyword=不存在地点XYZ | 200 `{list:[],total:0}` 空结果不异常 | 符合(TC-03) |
| P-21 | GET /api/courses | 200 total=9,含 teachers 简要 | 符合 2.10 |
| P-22 | GET /api/courses/:id | 200 teachers 含 relationId/schedule/location/office/officeHours | 符合 2.11 |
| P-23 | GET /api/courses/999999 | 404 | 符合 |
| P-24 | GET /api/teachers | 200 total=11,字段仅 id/name/title/office/officeHours/courses,**无电话/工号** | 符合 2.12(隐私红线) |
| P-25 | GET /api/teachers/:id | 200 含 courses[] | 符合 2.13 |
| P-26 | GET /api/search?keyword=校园卡 | 200 groups=[knowledge:6, service:2],无命中类型不出现 | 符合 2.14 |
| P-27 | &type=knowledge | 200 仅 knowledge 组 | 符合 |
| P-28 | keyword=ZZZ不存在关键词QQQ | 200 groups=[] | 符合(TC-03) |
| P-29 | GET /api/search(缺 keyword) | 400 VALIDATION_ERROR | 符合 |
| P-30 | &type=bogus | 400 "type 取值非法,应为 …" | 符合 |
| P-31 | GET /api/locations/999999 | 404 "地点不存在" | **备注:契约 2.9 未定义地点详情端点,后端注册了 GET /api/locations/:id(契约外端点,前端未调用)**,见对齐报告 |
| P-32 | GET /api/nonexistent-path | 404 "接口不存在: GET /api/nonexistent-path" | 符合统一响应包 |

### 2.2 管理流(契约第 3 节)

鉴权:无 token 401(A-03)/密码错 401 且话术统一(A-01)/登录成功仅回传 id/username/role 与 token,无密码哈希(A-04)。

知识全生命周期(自建 QA_ 数据,id=48,结束后已删除):
| # | 动作 | 判定 |
|---|---|---|
| A-09 | POST 新增 → `{id,status:"draft"}` | 符合 3.4 |
| A-10 | 缺标题 → 400 "标题不能为空"(message 含字段,TC-08) | 符合 |
| A-11 | effectiveFrom=2026/10/01 → 400 "日期格式应为 YYYY-MM-DD(effectiveFrom)" | 符合 |
| A-12 | PUT 编辑 draft → 状态保持 draft | 符合 3.5 |
| A-13/14 | submit-review →pending_review;重复提交 →409 | 符合 3.7 |
| A-15/16 | review publish →published;再审核 →409 | 符合 3.8 |
| A-17/19 | 发布后学生端 200 可见;takedown 后学生端立即 404 | 符合(TC-09) |
| A-20 | takedown 态 PUT 保存 → 状态回退 draft(先审后发) | 符合 3.5 |
| A-21 | change-logs 含 create/update/submit_review/review_publish/takedown,带 adminUsername | 符合 3.11 |
| A-22/23 | /expired 工作台:expired/expiring 两组,state=expired 过滤生效,项含 daysOverdue | 符合 3.10 |
| A-24 | DELETE published(seed 数据)→ 409 "仅草稿状态的知识可删除,其他状态请使用下架" | 符合 3.6 |
| A-25 | DELETE draft(自建)→ 成功 | 符合 |

六资源 CRUD 与冲突:
| # | 动作 | 判定 |
|---|---|---|
| A-26~31 | 分类:list 含 knowledgeCount;新增/重名 400 "分类名称已存在"/更新/删有关联 409 "该分类下仍有 10 条知识…"/删空分类成功 | 符合 3.12 |
| A-32~35 | 地点:新增/更新/删被引用 409 "该地点仍被 2 条记录引用(指南/活动/办公室/上课教室)…"/删未引用成功 | 符合 3.15 |
| A-36~39 | 指南:新增/管理端详情回显/更新/删除 | 符合 3.13(GET :id 详情为契约未明示项,见对齐报告) |
| A-40~43 | 活动:新增/endTime<startTime 400 "结束时间(endTime)不能早于开始时间(startTime)"/更新/删除 | 符合 3.14 |
| A-44/45 | 课程:新增/课程代码重复 400 "课程代码已存在" | 符合 3.16 |
| A-46 | 教师含 phone 多余字段 → 400 "包含不允许提交的字段: phone" | 符合 3.17(zod strict) |
| F-01~F-11 | 修正流:建地点→建教师(officeLocationId 有效,且**校验地点存在性**见 A-47 备注)→建课程→新增任教关系/重复 409 "该教师已关联此课程"/关系列表/学生端详情同步可见/删关系/删课程/删教师/删地点,全部通过 | 符合 3.18 |
| A-51 | 删除存在任教关系的课程(seed)→ 409 "该课程仍有 1 条任教关系,请先删除任教关系" | 符合 3.16 |

AI 日志:
| # | 动作 | 判定 |
|---|---|---|
| A-55 | GET /api/admin/ai-logs?page=1&pageSize=5 | 200 分页,项含 sessionKey/role/sources/mode/retriever/latencyMs | 符合 3.19 |
| A-56 | startDate/endDate 过滤 | 200 生效 | 符合 |
| A-57 | startDate=2026/10/24 | 400 "startDate 格式应为 YYYY-MM-DD" | 符合 |
| A-58 | ?export=1 | 200 文件流:CT=application/jsonl; charset=utf-8,CD=attachment; filename="ai-chat-export-20261024-2316.jsonl",首行 JSON 含 sessionId/role/content/mode | 符合 3.19 导出分支 |

### 2.3 AI 对话(契约 2.15,详见 ai-chat-quality-report.md)

| # | 场景 | 结果 |
|---|---|---|
| AI-01 | "校园卡丢了怎么补办?" | 200,5 条 knowledge 来源,answer 末尾附来源编号列表,mode=fallback |
| AI-02 | 来源可跳转 | sources[0] knowledge#44 经公开详情接口 200 验证存在 |
| AI-03 | "校园跑有什么要求?" | 200 拒答"知识库未覆盖该问题,请咨询相关部门核实。",sources=[] —— **行为合规但属漏检(短问句不分词),记质量缺陷** |
| AI-04/05 | 天气 / 1+1 | 均拒答,sources=[],不编造 |
| AI-06 | 提示词注入攻击 | 不泄露系统提示词/密钥,返回拒答话术 |
| AI-07 | 含姓名学号提问 | 回答不复述个人身份信息,sources 正常 |
| AI-08/09' | 500 字→200;501 字→400 "message 不能超过 500 字符";600 字→400 | 符合(首轮 AI-09 FAIL 为脚本 bug,实测补验 500/501/600 三档边界正确) |
| AI-10~13 | 空串/纯空白/非 UUID sessionId/缺 message | 均 400,message 中文指明字段 |
| AI-14 | 同一 sessionId 连续追问 | 两次均 200 落库串联 |

### 2.4 异常清单(需总控分派,本 Agent 未修复)

1. **[缺陷-接口] DELETE /api/admin/courses/:id/teachers/:relationId 传非法 relationId 时返回英文报错**
   - 复现:`DELETE /api/admin/courses/1/teachers/abc`(带管理员 token)
   - 实际响应原文:`{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Invalid input: expected number, received NaN"}}`
   - 预期:契约 1.1 "error.message 为可直接展示给用户的中文"(对照同控制器 relationId 自身有中文 message"relationId 必须为正整数",仅 id 无)
   - 位置:backend/src/controllers/course.controller.ts:190-193(id 字段缺中文 message)、backend/src/routes/admin.routes.ts:88-91(该路由未用 validate 中间件,与其他路由风格不一致)
2. **[缺陷-质量] 短问句检索漏检导致误拒答**
   - 复现:POST /api/ai/chat `{"message":"校园跑有什么要求?"}`(8 字)
   - 实际:`{"answer":"知识库未覆盖该问题,请咨询相关部门核实。","sources":[]}`,而知识库存在"校园跑打卡规则说明"(id=44)
   - 对照:同为校园跑提问,"校园跑打卡有什么规则要求?""体育课校园跑的要求是什么"均能命中 id=44
   - 根因:backend/src/ai/retriever/local-kb-retriever.ts:91 —— 2~8 字分段整句作为检索词,不做子词切分;恰为 8 字的自然问句整体匹配失败
   - 契约层面合规(如实拒答、sources 空、不编造),属检索质量问题,详见 ai-chat-quality-report.md

### 2.5 TC-01~TC-10 覆盖对照(本次实测口径)

| TC | 本次覆盖 |
|---|---|
| TC-01 有效关键词搜索 | P-04、P-26 ✓ |
| TC-02 空关键词/缺省 | P-03(缺省 200)、P-29(search 缺 keyword 400)✓ |
| TC-03 不存在关键词 | P-20、P-28 空结果不异常 ✓ |
| TC-04 详情 | P-10、P-12、P-22、P-25 ✓ |
| TC-05 分类筛选 | P-05 ✓ |
| TC-06 新增知识→学生可查 | A-09→A-17 链路 ✓ |
| TC-07 未授权调用管理接口 | A-01(401)/A-03(401)✓;403 分支由伪造 token 实测覆盖(401,因角色校验先于…实测为无角色 payload 时 403 逻辑在 requireAdmin 中,代码审计确认语义区分正确) |
| TC-08 缺标题/非法日期 | A-10、A-11、A-41 ✓ |
| TC-09 过期/下架可见性 | A-19(下架即 404)、A-22(过期工作台)、P-10(isExpired)✓ |
| TC-10 数据库不可用 | 回归套件 error-middleware.test.ts 通过(500 统一话术不含堆栈,响应原文见 A 组所有 4xx/5xx 无 stack 字段) |

> 备注:docs/testing/tc-mapping.md 尚未建立(目录不存在),映射的正式登记需总控裁决后由测试 Agent 补建。

## 三、结论

- 全量回归:**通过**(backend 104/104,frontend 40/40,双端 lint/build 零错误)。
- 接口实测:**基本通过**。契约行为符合度高(状态机、409 冲突、分页、错误码、来源字段、隐私约束全部符合);确认 1 个文案级契约偏差(F-12)与 1 个检索质量缺陷,均不阻塞阶段验收,已列修复建议待总控分派。
- 遗留观察项:GET /api/locations/:id 契约外端点、admin 四个详情 GET 契约未明示 —— 详见 api-alignment-report.md。
