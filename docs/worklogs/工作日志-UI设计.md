# 前端设计师 Agent 工作日志

## 任务书(2026-10-24)

**角色**:SSDA 前端设计师 Agent(`.zcode/agents/ssda-ui-designer.md`),只改样式与文案,不改业务逻辑。

**用户要求**:界面符合当代审美、设计规范,文字与内容显示优雅舒适。

**交付物**:
1. 设计规格 `docs/design/05-UI设计规格.md`:设计令牌(主色/状态四态色/间距/圆角/字号/阴影)、组件约定(页头/卡片/表格/表单/空态/加载态/面包屑)、中文文案规范。
2. 全局与逐页落地:
   - 全局:统一样式文件 `frontend/src/styles/index.css`(字体栈、页面背景、卡片圆角阴影、Element Plus 主题变量覆盖),`main.ts` 引入。
   - 布局:StudentLayout 顶部导航精修、AdminLayout 侧边栏分组/选中态、PageFooter 数据来源声明。
   - 逐页检查 11+9 页:标题层级、卡片间距、空状态/加载态文案、表单 label 与占位符、按钮动宾文案、StatusTag/ExpiredBanner 视觉语义、AI 对话气泡。
   - 中文排版:中英文间空格、全角标点、数字单位规范。

**硬边界**:
- 只改 `<style>`、全局 css、模板静态文案与结构微调、Element Plus 主题变量;禁止改 api/stores/router/tests 逻辑、接口调用与契约字段绑定;禁止新增依赖;禁止改 backend。
- 不删除或弱化既有功能与状态提示(过期横幅/待核实提示必须保留)。
- 完成前必须全绿:`npm run lint`(先 --fix)、`npm test`(40 用例)、`npm run build`。
- 不 git 操作;除 04-页面规格.md 外不改其他设计文档(可新建 04)。

## 节点

- [x] 节点 0(2026-10-24):任务书落地;通读 00-项目简报、04-页面规格、frontend/src 全部 11 学生页 + 9 管理页 + 8 组件 + main.ts/App.vue/index.html/package.json。加载 ssda-frontend、ssda-requirements skill。
- [x] 节点 1:产出 `docs/design/05-UI设计规格.md` v1.0(设计原则、令牌、EP 变量覆盖表、组件约定、中文文案规范、落地映射、追溯小节)。
- [x] 节点 2:新增 `frontend/src/styles/index.css` 并在 `main.ts` 引入(置于 element-plus 样式后):主色 #2b7fff + color-mix 派生色阶、四态色(success #16a34a / warning #d97706 / info #909399 / danger #dc2626)、圆角 12/8/6、阴影两级、字体栈、页面背景 #f6f8fb、卡片/表格/alert/dialog 全局精修、`.page-head`/`.filter-bar`/`.pager` 通用类。
- [x] 节点 3:布局与基础组件——StudentLayout(吸顶+阴影+品牌圆点+菜单精修+搜索框 280px)、AdminLayout(菜单按"内容管理/信息维护/质量运维"分组,选中项浅蓝底,无图标依赖)、PageFooter(两行声明)、StatusTag(round)、ExpiredBanner(圆角,文案原文保留)、KnowledgeCard(摘要两行截断+hover 上浮)、SearchBar、AiFloatEntry。
- [x] 节点 4:学生端 11 页 + NotFoundView 逐页打磨(页头描述、Hero 渐变、详情白卡容器、聚合搜索"共 N 条"、AI 气泡两侧区分/来源卡片化/降级条柔和、空态语义化)。
- [x] 节点 5:管理端 9 页逐页打磨(页头+描述、各列表空态由"暂无数据"语义化、LoginView 渐变背景+副标题、AiLog 消息块配色、表格/分页间距统一)。
- [x] 节点 6:中文排版批处理——模板与用户可见提示串中的半角括号改全角(ExpiredBanner 除外,文案被 KnowledgeDetailView.spec 断言锁定)、CJK 后半角 ?/! 改全角、"240ms"→"240 ms";行尾归一为 CRLF。
- [x] 节点 7:验证全绿(结果见完成报告);worklog 完成报告。

## 完成报告(2026-10-24)

### 已完成

全部交付物按任务书完成,未触碰 api/stores/router/tests/backend,未新增依赖,未做 git 操作。

### 改动清单(文件级)

**新增**
- `docs/design/05-UI设计规格.md` — UI 设计规格 v1.0
- `frontend/src/styles/index.css` — 全局设计令牌 + Element Plus 主题覆盖 + 通用类

**修改(前端,共 25 个文件)**
- `frontend/src/main.ts` — 引入全局样式(1 行 import + 注释)
- `frontend/src/components/layout/StudentLayout.vue`、`AdminLayout.vue` — 布局精修(Admin 菜单分组为模板结构微调)
- `frontend/src/components/`:`PageFooter.vue`、`StatusTag.vue`、`ExpiredBanner.vue`、`KnowledgeCard.vue`、`SearchBar.vue`、`AiFloatEntry.vue`
- `frontend/src/views/student/`:`HomeView`、`KnowledgeListView`、`KnowledgeDetailView`、`ServiceListView`、`ServiceDetailView`、`ActivityListView`、`ActivityDetailView`、`LocationView`、`CourseTeacherView`、`SearchResultView`、`AiChatView`(11 页)
- `frontend/src/views/admin/`:`LoginView`、`KnowledgeManageView`、`CategoryManageView`、`ServiceManageView`、`ActivityManageView`、`LocationManageView`、`CourseTeacherManageView`、`ExpiredWorkbenchView`、`AiLogView`(9 页)
- `frontend/src/views/NotFoundView.vue`

**未改动**:frontend/src/{api,stores,router,types,utils,__tests__} 全部、backend 全部、docs/design/00~03 与 接口契约.md。

### 设计决策说明

1. **主色 #2b7fff**:介于蓝与青的教育清新蓝;用 CSS `color-mix()` 由主色实时派生 light-3~9/dark-2 色阶,一套变量覆盖 primary/success/warning/danger/info 五组,保证 tag light/plain、alert、菜单选中背景全部同源。目标浏览器为 Chrome/Edge 最新两个大版本(简报 3.5),`color-mix` 可用。
2. **状态四态色整体加深一档**(success #16a34a、warning #d97706、danger #dc2626):EP 默认色白底文字对比不足;draft 保持 EP info 灰 #909399。
3. **图标不做**:侧边栏"图标语义"以 EP 自带 `el-menu-item-group` 分组(内容管理/信息维护/质量运维)替代——`@element-plus/icons-vue` 不在依赖中,硬边界禁止新增依赖。
4. **面包屑不引入**:单层信息架构 + 详情页已有"← 返回 xx 列表"链接,引入面包屑收益低;规格中明确以返回链接代替。
5. **ExpiredBanner 文案保持原样(含日期外半角括号)**:`KnowledgeDetailView.spec.ts:61` 断言 `该信息已过有效期(2026-09-30)` 原文,禁改 tests,故横幅为全角化规则的显式例外(已在规格 4.7 注明)。
6. **详情页白卡容器**:知识/指南/活动详情包一层白底圆角卡,与列表卡片语言一致;ServiceDetailView 办理地点恢复显示地点名称(全角括号),未删除任何既有信息。
7. **骨架屏不做**:本期沿用 `v-loading`,规格中说明理由(不新增结构),留待后续迭代。
8. **脚本区文案**:ElMessageBox.confirm / ElMessage 中的静态提示串按动宾与全角标点打磨(如"确认提交「xx」进入审核?");均为字符串字面量,不涉及逻辑与字段。

### 测试与构建结果原文

```
> ssda-frontend@0.1.0 lint
> eslint .
(无任何告警/错误输出)

Test Files  7 passed (7)
     Tests  40 passed (40)

✓ built in 9.47s
```
(vite build 另有既有的 chunk >500 kB 提示,源于 Element Plus 全量引入,本次改动前已存在,未处理。)

命令:`export PATH="/c/Program Files/nodejs:$PATH"` 后依次 `npm run lint -- --fix` → `npm run lint` → `npm test` → `npm run build`。

### 遗留建议(不阻塞验收)

1. `index-*.js` 主包 1.09 MB:建议后续在 `vite.config.ts` 配 `manualChunks` 拆 Element Plus,或改按需引入(unplugin-vue-components)——涉及构建配置,超出本次边界。
2. 列表首屏可升级 `el-skeleton` 骨架屏替代 `v-loading`,提升感知性能。
3. 全角化脚本(临时文件)已用完即弃,未入仓库;后续新页面建议直接遵循 04 规格第 5 节文案规范。
4. ExpiredBanner 日期外侧括号现为半角(测试锁定);若未来由总控修订 04-页面规格 与测试用例,可一并全角化。
