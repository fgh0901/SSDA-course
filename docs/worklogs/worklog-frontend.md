# worklog-frontend(前端工程师 Agent)

## 任务书(2026-10-24)

### 目标
按 `docs/design/03-page-spec.md` 路由表与 `docs/design/api-contract.md` v1.0(冻结)实现 SSDA 全部前端页面:学生端 11 条路由 + 管理端 9 条路由 + 基础设施(http 解包/api 模块/types/stores/router/布局组件)+ Vitest 测试。

### 范围与允许改动
- `frontend/`(src 全部、vite.config.ts、tsconfig.json)
- `docs/worklogs/worklog-frontend.md`(本文件)
- 不碰 backend/、db/、契约、skills;不做 git 操作;不启动后端服务

### 预期产出
- src/api/http.ts(响应包 {success,data,error} 解包;401 清 token 跳 /admin/login)+ 9 个资源 api 模块
- src/types/ 与契约逐字一致的 camelCase 类型
- src/stores/auth.ts(token 持久化 ssda_token)、category.ts(分类缓存)
- src/router/index.ts(11+9 条路由,管理端守卫)
- 布局:StudentLayout(导航+分类下拉+搜索+AI 入口+页脚)、AdminLayout(侧边栏+退出)
- 学生端 11 页、管理端 9 页、公共组件(StatusTag/KnowledgeCard/ExpiredBanner/SearchBar/PageFooter/AiFloatEntry)
- Vitest:拦截器解包、TC-02 空关键词、TC-09 过期横幅、StatusTag、AiChat 降级、管理端表单校验(TC-08)
- npm run lint / test / build 全绿

### 过程记录

- 2026-10-24 基础设施完成:vite.config.ts/tsconfig.json 补 `@/` 别名;src/types(9 个文件,契约 camelCase 字段);src/api(http.ts 解包+401/403 处理,knowledge/categories/services/activities/locations/courses/search/ai/admin 9 模块);stores(auth 持久化 ssda_token、category 缓存);router(学生端 11 + 管理端 9 条,管理端守卫);组件 StatusTag/ExpiredBanner/KnowledgeCard/SearchBar/PageFooter/AiFloatEntry/StudentLayout/AdminLayout;utils/datetime(日期校验与过期计算)。
- 2026-10-24 学生端 11 页完成:HomeView、KnowledgeListView(TC-02 空关键词提示、categoryId 同步 URL)、KnowledgeDetailView(过期横幅/404 友好页/禁 v-html)、ServiceListView+Detail、ActivityListView+Detail(time Tab)、LocationView(校区/建筑/楼层级联)、CourseTeacherView(双 Tab+详情抽屉,P03 不推断)、SearchResultView(类型 Tab+查看更多)、AiChatView(sessionId 持久化/来源列表/降级提示/防重复)。
- 2026-10-24 http.ts 修正:区分登录 401(密码错误,展示后端 message 不跳转)与会话失效 401(清 token 跳 /admin/login)。

- 2026-10-24 管理端 9 页完成:LoginView(账号 3~30/密码 6~64 校验、401 表单级错误)、KnowledgeManageView(状态 Tab 全部/草稿/待审核/已发布/已下架、新增/编辑表单 TC-08 双保险校验、提审/审核(驳回 comment 必填)/下架/删除按状态显隐、变更日志抽屉)、CategoryManageView(name 必填、knowledgeCount 预警、删除 409 提示)、ServiceManageView、ActivityManageView(endTime ≥ startTime)、LocationManageView、CourseTeacherManageView(课程/教师双 Tab + 任教关系维护抽屉,重复关联 409)、ExpiredWorkbenchView(已过期/7 天临期 Tab,P05 人工核实提示)、AiLogView(按会话折叠 + mode 标签 + 日期过滤 + JSONL 导出)。
- 2026-10-24 Vitest 7 个测试文件 40 用例全绿:http 拦截器解包(成功/失败/401 登录与会话/403/500/网络异常/带 token)、knowledgeRules(TC-08)、StatusTag、KnowledgeListView(TC-02/03)、KnowledgeDetailView(TC-04/09 过期横幅)、AiChatView(降级提示/来源/防重复/400)、routerGuard(守卫跳转)。网络请求全部 mock,不依赖后端。
- 2026-10-24 eslint --fix 清理格式告警(0 errors 0 warnings);vue-tsc 0 错误;vite build 成功。

### 契约疑问/缺陷登记
- 契约 3.19 `GET /api/admin/ai-logs?export=1` 为 JWT 保护接口,`window.open` 无法携带 Authorization 头 → 前端改用 axios blob 下载(带 token)再触发浏览器保存,导出 URL 参数与契约一致(startDate/endDate/export=1)。已在最终报告提请总控确认。
- 契约 2.3 学生端知识列表项无 isExpired 字段,03-page-spec 3.2 要求列表展示过期标识 → 列表按 effectiveUntil 客户端计算"已过期"标签仅作展示;详情页以服务端 isExpired 为准(契约 2.4)。提请总控确认口径。

### 完成报告

**结果**:全部交付物完成。`npm run lint`(0 problems)、`npm test`(7 文件 40 用例通过)、`npm run build`(vue-tsc 0 类型错误 + vite build 成功)三项全绿。

**产出路径**:
- 基础设施:`frontend/src/api/http.ts` + 9 个资源模块、`src/types/`(10 文件,契约 camelCase 逐字对照)、`src/stores/auth.ts`(ssda_token 持久化)、`src/stores/category.ts`、`src/router/index.ts`(学生端 11 + 管理端 9 条 + 守卫)、`src/utils/datetime.ts`、`src/utils/knowledgeRules.ts`
- 布局与公共组件:`src/components/layout/StudentLayout.vue`、`AdminLayout.vue`、`AiFloatEntry/ExpiredBanner/KnowledgeCard/PageFooter/SearchBar/StatusTag.vue`
- 学生端 11 页:`src/views/student/`(Home、KnowledgeList、KnowledgeDetail、ServiceList/Detail、ActivityList/Detail、Location、CourseTeacher、SearchResult、AiChat)
- 管理端 9 页:`src/views/admin/`(Login、KnowledgeManage、CategoryManage、ServiceManage、ActivityManage、LocationManage、CourseTeacherManage、ExpiredWorkbench、AiLog)
- 测试:`src/__tests__/`(http/knowledgeRules/StatusTag/KnowledgeListView/KnowledgeDetailView/AiChatView/routerGuard + setup,全部 mock 网络层)
- 配置变更:`vite.config.ts`(+alias、+test.setupFiles)、`tsconfig.json`(+paths)

**自测情况**:lint/test/build 全绿;40 用例覆盖任务书要求的 6 类场景 + 守卫;接口联调未做(按边界约定,由总控统一安排)。

**遗留问题**:
1. 导出接口下载方式偏差(见契约疑问登记 1)。
2. 学生端列表过期标识为客户端计算(见契约疑问登记 2)。
3. build 有 chunk >500kB 提示(Element Plus 全量引入,脚手架既有方式),功能无影响,如需可后续按需引入优化。

**需总控决策事项**:上述两条契约疑问;另建议为"AI 问答专项(检索命中/拒答/降级/隐私)"与"409 冲突类操作"增补自动化用例(与契约矩阵备注 2/3 一致)。

## 任务 2:GUI 验收缺陷修复(2026-10-24)

### 任务书
- 依据:`docs/test/gui-acceptance-report.md`(2026-10-24 GUI 验收,缺陷 D-MED-1/2/3、D-LOW-1~5)+ `docs/design/04-ui-design-spec.md` + ssda-frontend 规范
- 方案裁决(总控):D-MED-1 用前端 localStorage 持久化消息列表(按 sessionId 存 key `ssda_ai_history_<sessionId>`,上限最近 50 条),不加后端接口;D-MED-2 用真实日历校验拦截非法日期(2026-13-99 类),失败提示「日期不合法,请选择真实存在的日期」
- 范围:仅 `frontend/` 与本 worklog;不碰 backend/、契约、skills;5173 为用户开启的 vite(热更新即时生效),3000 后端不动
- 顺序:F1 AI 历史保留 → F2 非法日期拦截 → F3 导出反馈 → F4 空关键词提示 → F5 弹窗中文化 → F6 1024 响应式 → F7「全部分类」重置项;每 1~2 项小步提交,lint/test/build 全绿后收尾

### 过程记录
(修复过程中逐项补记)
