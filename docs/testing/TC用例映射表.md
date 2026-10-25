# TC ↔ 自动化用例映射表(正式)

- 建立时间:2026-10-24 | 维护人:ssda-tester(测试与审计 Agent)
- 依据:ssda-testing skill 第 2 节骨架 + 接口契约.md 第 5 节追溯矩阵备注 2/3
- 最近一次全量回归:2026-10-24,backend jest **104/104 通过**、frontend vitest **40/40 通过**(详见 docs/test/接口功能实测报告.md 第一节);另有 117 项 3000 端口线上接口实测作为补充佐证(同报告第二节)。
- 状态取值:待实现 / 已实现 / 已通过 / 失败(附原因)。**本表当前全部"已通过"**。
- 命名备注:skill 3 节要求 it 名带 TC 编号;下表"用例名"列逐字取自代码现状。部分后端用例名尚无 TC-xx 前缀(如 ai-chat.test.ts 的"检索命中:…"),已在本表挂接,建议由对应负责 Agent 补前缀,补前缀后本表同步更新。

## 一、TC-01~TC-10(简报 3.4 骨架,操作/预期原文保留)

| 编号 | 操作(简报 3.4) | 预期(简报 3.4) | 自动化用例文件 | 用例名 | 来源 | 状态 |
|---|---|---|---|---|---|---|
| TC-01 | 有效关键词搜索 | 返回相关结果及标题、分类摘要 | backend/tests/knowledge.test.ts;backend/tests/search.test.ts | `TC-01 有效关键词搜索:返回相关结果,含标题/分类摘要/来源/有效期`;`TC-01 有效关键词:返回按类型分组的命中结果`;`TC-01 type 筛选:仅返回所选类型分组` | 简报 3.4(契约矩阵) | 已通过 |
| TC-01 | 〃 | 〃 | frontend/src/__tests__/KnowledgeListView.spec.ts | `有结果时渲染标题、待核实标签与分类` | 〃 | 已通过 |
| TC-02 | 空关键词 | 提示输入关键词或展示默认列表,不异常 | backend/tests/knowledge.test.ts;backend/tests/search.test.ts | `TC-02 空关键词:返回默认列表,HTTP 200 且 success=true,不异常`;`TC-02 空关键词:返回 400 并提示输入关键词(服务端校验兜底)` | 简报 3.4 | 已通过 |
| TC-02 | 〃 | 〃 | frontend/src/__tests__/KnowledgeListView.spec.ts | `TC-02 空关键词搜索:展示"请输入关键词"提示与默认列表,页面不异常` | 〃 | 已通过 |
| TC-03 | 不存在的关键词 | 无匹配结果提示 | backend/tests/knowledge.test.ts;backend/tests/search.test.ts | `TC-03 不存在的关键词:返回空列表而非异常`;`TC-03 不存在的关键词:groups 为空数组(前端统一展示无结果)` | 简报 3.4 | 已通过 |
| TC-03 | 〃 | 〃 | frontend/src/__tests__/KnowledgeListView.spec.ts | `TC-03 无匹配结果:展示空状态引导文案` | 〃 | 已通过 |
| TC-04 | 打开知识详情 | 展示正文、来源、更新时间、状态 | backend/tests/knowledge.test.ts | `TC-04 打开知识详情:展示正文、来源、更新时间、状态` | 简报 3.4 | 已通过 |
| TC-04 | 〃 | 〃 | frontend/src/__tests__/KnowledgeDetailView.spec.ts | `TC-04 展示正文、来源、更新时间与分类` | 〃 | 已通过 |
| TC-05 | 按分类筛选 | 结果仅含所选分类 | backend/tests/knowledge.test.ts;backend/tests/categories.test.ts | `TC-05 按分类筛选:结果仅含所选分类`;`TC-05 按分类筛选前置:返回启用分类,按 sortOrder 升序,不分页(list 结构)` | 简报 3.4 | 已通过 |
| TC-06 | 管理员新增知识 | 校验通过写入数据库,学生端按发布规则可查 | backend/tests/admin-knowledge.test.ts | `TC-06 管理员新增知识:写入数据库(初始 draft),学生端按发布规则暂不可查`;`P04 全流程:submit-review → review publish → 学生端可见` | 简报 3.4 | 已通过 |
| TC-07 | 普通用户(未授权)调用管理接口 | 服务端拒绝 | backend/tests/admin-auth.test.ts | `TC-07 未携带 token 调用管理接口:401 服务端拒绝`;`TC-07 token 无效或被篡改:401`;`TC-07 已登录但角色非 admin:403 FORBIDDEN`;`TC-07 有效 token 访问管理接口:放行(对照分支)`;`TC-07 各管理端点均受保护(抽样:categories/services/ai-logs CRUD 入口)` | 简报 3.4 | 已通过 |
| TC-07 | 〃 | 〃(体验层) | frontend/src/__tests__/routerGuard.spec.ts | `未登录访问 /admin/knowledge:重定向登录页并携带 redirect 参数` 等 5 条(见 routerGuard.spec.ts) | 〃 | 已通过 |
| TC-08 | 录入缺标题/无效日期 | 拒绝保存并提示具体错误 | backend/tests/admin-knowledge.test.ts | describe `TC-08 校验失败拒绝保存(契约 3.4,message 指明字段)` 下:`缺标题:400 且 message 含"标题"`;`缺来源:400 且 message 含"来源"(FR-11)`;`无效日期:400 且提示 YYYY-MM-DD 格式`;`有效期止早于有效期起:400`;`分类不存在或停用:400` | 简报 3.4 | 已通过 |
| TC-08 | 〃 | 〃 | frontend/src/__tests__/knowledgeRules.spec.ts | `标题必填与长度上限`;`日期格式校验:非法格式提示"日期格式应为 YYYY-MM-DD"` 等表单校验规则用例 | 〃 | 已通过 |
| TC-09 | 查看已过期知识 | 显示过期标识或隐藏已下架内容 | backend/tests/knowledge.test.ts;backend/tests/admin-knowledge.test.ts | `TC-09 已过期知识:仍可见且服务端返回 isExpired=true 与有效期字段`;`TC-09 学生端列表仅返回 published(草稿/待审核/下架均不可见)`;`TC-09 草稿与待审核知识:学生端访问返回 404`;`契约 3.9:takedown 仅 published 可下架;下架后学生端 404(TC-09)`;`TC-09 已下架知识重新上架也须经审核(takedown → pending_review 可行)` | 简报 3.4 | 已通过 |
| TC-09 | 〃 | 〃 | frontend/src/__tests__/KnowledgeDetailView.spec.ts | `TC-09 isExpired=true 时渲染过期横幅`;`未过期(isExpired=false)不渲染过期横幅`;`404(不存在/已下架):渲染友好页并提供返回入口,不异常` | 〃 | 已通过 |
| TC-10 | 数据库连接不可用 | 友好错误提示,不泄露堆栈/凭据 | backend/tests/error-middleware.test.ts | describe `TC-10 数据库连接不可用(M08/NFR 安全红线)` 下:`业务接口返回 500 与统一话术"系统繁忙,请稍后重试"`;`写接口同样 500(登录分支)`;`/api/health 仍返回 200,db:"down"(供运维判断)`;`反向验证:响应不泄露堆栈、ECONNREFUSED、主机与凭据` | 简报 3.4 | 已通过 |
| TC-10 | 〃 | 〃 | frontend/src/__tests__/http.spec.ts | `500(数据库不可用):展示统一话术"系统繁忙,请稍后重试",不泄露堆栈(TC-10)` | 〃 | 已通过 |

## 二、TC-11~TC-16(项目补充用例,本轮登记)

| 编号 | 操作 | 预期 | 自动化用例文件 | 用例名 | 来源 | 状态 |
|---|---|---|---|---|---|---|
| TC-11 | AI 对话命中与来源:学生端 AI 页提问知识库覆盖的问题(如校园卡补办类) | 200;回答末尾附来源编号列表,sources 非空且 type/id 指向真实可见资源;mode/retriever 如实标注(当前开发期为 fallback/local_kb) | backend/tests/ai-chat.test.ts | `检索命中:返回模板化回答 + 来源数组 + mode=fallback + retriever=local_kb` | 契约矩阵备注 3(AI 专项:检索命中) | 已通过 |
| TC-11 | 〃(前端渲染) | 用户/AI 消息渲染,请求携带持久化匿名 sessionId;fallback 时展示降级提示条且来源列表可渲染 | frontend/src/__tests__/AiChatView.spec.ts | `发送问题:请求携带 sessionId 与消息,渲染用户与 AI 消息`;`mode=fallback 时渲染降级提示条,来源列表可渲染`;`进入页面展示欢迎消息,sessionId 使用持久化的 uuid` | 契约矩阵备注 3 | 已通过 |
| TC-12 | AI 检索不到拒答:提问**知识库检索不到可信内容**的问题(以"检索无命中/isReliable=false"为判定,不锁定具体问句措辞) | 200;返回"知识库未覆盖该问题,请咨询相关部门核实"类核实话术;sources 为空数组;不编造任何信息 | backend/tests/ai-chat.test.ts | `检索未命中:拒答话术 + sources 为空数组(禁止编造)` | 契约矩阵备注 3(AI 专项:检索未命中拒答) | 已通过 |
| TC-12 | 〃(前端) | sources=[] 时回答话术原样展示,无来源列表 | frontend/src/__tests__/AiChatView.spec.ts | `sources=[](知识库未覆盖):回答话术原样展示,无来源列表` | 〃 | 已通过 |
| TC-13 | AI 降级模式与日志落库:DEEPSEEK_API_KEY 未配置或 LLM 不可用时提问 | mode=fallback 降级模板回答且不返回 500;user/assistant 双消息写入 ai_chat_message,assistant 带 sources_json/mode/retriever/latency_ms;仅匿名 sessionId,无任何身份字段;已下架/草稿/待审核知识不可被检索 | backend/tests/ai-chat.test.ts | `落库断言:user/assistant 双消息写入 ai_chat_message,assistant 带 sources_json/mode/retriever/latency_ms`;`隐私红线:落库仅有匿名 sessionId,无任何身份字段`;`可解释性:已下架/草稿/待审核知识不可被检索到`;`400 分支:sessionId 非 UUID…`;`400 分支:message 为空或超过 500 字` | 契约矩阵备注 3(AI 专项:降级路径/隐私不留身份信息) | 已通过 |
| TC-14 | 分类删除 409 冲突:删除仍有关联知识的分类 | 409 CONFLICT,message 含关联条数(如"该分类下仍有 N 条知识,请先迁移或删除");无关联时可正常删除 | backend/tests/admin-crud.test.ts | `新增/重名 400/更新/删除;删除有关联知识时 409 并提示条数`;`404 分支:更新/删除不存在的分类` | 契约矩阵备注 2(建议增补"分类删除冲突(409)") | 已通过 |
| TC-15 | 任教关系维护与 409:课程-教师任教关系添加/查询/删除;同一 (courseId, teacherId) 重复添加;删除仍带关系的课程/教师 | 维护链路可用,学生端课程详情同步可见;重复添加 409 "该教师已关联此课程";有任教关系的课程/教师删除 409 并提示先解除 | backend/tests/admin-crud.test.ts;backend/tests/courses-teachers.test.ts | `添加/重复 409/列表/按关系主键删除`;`课程 CRUD;课程代码重名 400;有任教关系删除 409`;`教师 CRUD;strict 拒绝电话/工号等隐私字段(400);有任教关系删除 409`;`详情:任教关系含教师/上课时间/上课地点/办公室/答疑时间(契约 2.11 示例结构)`;`P03 红线:未录入任教关系的课程返回空数组,不做推断` | 契约矩阵备注 2(建议增补"任教关系维护") | 已通过 |
| TC-16 | AI 日志查询与 JSONL 导出:管理端按 sessionKey/日期查询;?export=1 导出 | 未带 token 401;分页列表项含 sources/mode/latencyMs;导出为 JSONL 文件流(attachment),每行含 sessionId/role/content/sources/mode/createdAt;日期格式非法 400 | backend/tests/ai-chat.test.ts | `TC-07 未带 token:401`;`按 sessionKey 过滤的分页列表,assistant 消息带 sources/mode/latencyMs`;`?export=1 返回 JSONL 文件流,每行含契约字段`;`日期过滤:startDate 400 校验与正常过滤` | 契约矩阵备注 2(建议增补"AI 日志导出")+ 备注 3 | 已通过 |

## 三、维护规则(沿用 ssda-testing skill 第 2 节)

- 新增/修改用例后**当天**更新本表"自动化用例文件、用例名、状态"列。
- 状态取值:待实现 / 已实现 / 已通过 / 失败(附原因链接,指向 docs/test/接口功能实测报告.md 对应章节)。
- 契约或需求变更导致"操作/预期"变化时,不得私改简报原文列,上报总控。
- 阶段回归必须全量重跑并在本表头部更新"最近一次全量回归"结果。
