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

## 第二轮美化(总控指令)(2026-11-03)

**角色**:SSDA 前端设计师 Agent(`.zcode/agents/ssda-ui-designer.md`),执行第二轮全站美化,只改样式/文案/结构微调。

**背景**:库内数据已换成西南交通大学真实公开信息(31 个地点、51 条知识),管理端表格数据量上升;第一轮已建立设计令牌体系(`styles/index.css` + `docs/design/05-UI设计规格.md`),本轮为**精修轮**:在既有令牌内做细节,不换风格。

**本轮重点**:
1. 管理端 9 页逐页走查精修(重点 locations/knowledge):表格密度与可读性、斑马纹/悬浮态、操作列按钮层级、筛选区布局、分页位置、弹窗视觉与宽度、标签溢出。
2. PageFooter 数据来源声明由通用文案更新为"西南交通大学各官方部门公开通知(采集底稿可溯)"的优雅表述。
3. 学生端 11 页复查:首页 Hero、卡片 hover、AI 对话气泡真实长回答排版、详情页长正文排版(行距/段距)。
4. 全局:统一过渡动画时长与缓动(0.2s ease)、按钮 hover/active 态、表格空状态插画式文案、必要处 el-skeleton 骨架屏(仅样式层面)。

**硬边界**(同角色定义):
- 只改 `<style>`、模板静态文案与结构微调、全局 css;禁止改 api/stores/router/tests 逻辑、契约字段绑定;禁止新增依赖;禁止改后端。
- 测试锁定文案保持原文(如 ExpiredBanner 半角括号、"暂无任课信息,以教务系统课表为准"红线)。
- 完成前必须全绿:`npm run lint`(--fix)→ `npm test`(54 用例)→ `npm run build`(先 `export PATH="/c/Program Files/nodejs:$PATH"`)。
- 小步提交(中文 Conventional Commits,只 add frontend/、docs/design/05 与本 worklog)。

**交付节点**:
- [x] 节点 0:任务书 + 通读现状(管理端 9 页/学生端 11 页/8 组件/全局样式/测试锁定文案逐一复核)
- [x] 节点 1:全局令牌精修(index.css)
- [x] 节点 2:管理端 9 页精修
- [x] 节点 3:PageFooter + 学生端复查
- [x] 节点 4:规格文档追加第二轮精修记录(05-UI设计规格.md 第 8 节,版本 v1.1)
- [x] 节点 5:验证全绿 + 完成报告

## 完成报告(第二轮,2026-11-03)

### 改动清单(文件级,共 25 个文件)

**全局与布局**
- `frontend/src/styles/index.css` — 新增 `--ssda-transition: 0.2s ease` 令牌;卡片过渡与 hover(上浮+二级阴影+边框浅蓝)收敛全局;按钮统一过渡 + 主按钮 hover 柔光/active 轻压;表格容器圆角裁切、斑马纹 `#fafbfd`;分页 hover 主色;dialog 标题加重 + 页脚上缘分隔线;form label 色;骨架屏圆角。
- `frontend/src/components/layout/AdminLayout.vue` — 菜单 hover(light-9)/active(light-8)分层 + 过渡统一。
- `frontend/src/components/PageFooter.vue` — 数据来源具名西南交通大学(采集底稿可溯),留白/行距微调。
- `frontend/src/components/KnowledgeCard.vue` — 删除与全局重复的 transition/hover。

**管理端 9 页**
- `LocationManageView` — stripe + 分页 background;搜索降默认按钮、新增改 primary;名称/说明列 tooltip;表单补示例占位符、说明 3 行。
- `KnowledgeManageView` — 同上按钮层级;"已核实"灰字弱化,与"待核实"橙标签形成层次;删除页内分页间距覆盖;stripe + background。
- `CategoryManageView` — 新增改 primary;名称/描述列 tooltip;stripe。
- `ServiceManageView` — 按钮层级;标题/部门/地点列 tooltip;弹窗 620→640;占位符;stripe + background。
- `ActivityManageView` — 按钮层级;标题/报名方式列 tooltip;弹窗 620→640;报名方式占位符;stripe + background。
- `CourseTeacherManageView` — 双 Tab 按钮层级;课程名/任课教师/任教课程列 tooltip;双表格 stripe + 双分页 background。
- `ExpiredWorkbenchView` — stripe + background(P05 提示原文未动)。
- `AiLogView` — 查询降默认按钮、导出保持主操作;background;消息块加边框(assistant 浅蓝同源)。
- `LoginView` — 卡片 400px、副标题/登录按钮字距微调。

**学生端 11 页 + NotFound**
- `HomeView` — Hero 淡青径向光斑 + 留白 56/40;"最新知识"改 el-skeleton 骨架屏;分类卡 hover 收敛全局。
- `KnowledgeListView` — 列表改 el-skeleton 骨架屏;分页 background。
- `KnowledgeDetailView` — 长正文行高 1.9 + 字距 0.2px + 两端对齐 + 超长串换行。
- `AiChatView` — 气泡行高 1.75;内容/来源芯片 overflow-wrap: anywhere;芯片 max-width。
- `ServiceDetailView`、`ActivityDetailView` — descriptions 行高 1.8。
- `LocationView`、`ServiceListView`、`ActivityListView`、`CourseTeacherView` — 表格 stripe + 分页 background。
- `SearchResultView` — 删除与全局重复的 transition/hover。
- `NotFoundView` — "您"→"你"。

**设计决策**
1. 管理端"搜索/查询"降为默认按钮、"新增"唯一 primary:页面单主按钮原则;学生端搜索仍 primary(其即主操作)。
2. "新增 xx"success→primary:绿色语义归还状态标签,呼应"不引入第二种品牌色"。
3. 骨架屏仅落首页最新知识 + 知识列表两处(首屏感知最强),`:loading` 复用既有 ref,零逻辑改动。
4. 斑马纹行底色 #fafbfd 与表头 #f8fafc、hover #f5f8ff 三层浅色互不混淆。
5. 测试锁定文案(ExpiredBanner 半角括号/空态句式/欢迎语/P03、P05 红线)全部保持原文。

### 测试与构建结果原文

```
> eslint .(--fix 后无告警/错误)

Test Files  9 passed (9)
     Tests  54 passed (54)

✓ built in 8.63s
```
(vite build 的 chunk >500 kB 提示为既有问题,源于 Element Plus 全量引入,本次未触碰构建配置。)

命令:`export PATH="/c/Program Files/nodejs:$PATH"` 后依次 `npm run lint -- --fix` → `npm run lint` → `npm test` → `npm run build`,两批改动各验证一轮,均全绿。

### 遗留建议(不阻塞验收)

1. 主包 1.09 MB 仍未拆分(manualChunks / 按需引入,涉及构建配置,超出边界)。
2. 管理端列表页可继续引入 el-skeleton(本轮按"必要处"克制,仅学生端两处);管理端首屏 v-loading 蒙层观感可接受。
3. ExpiredBanner 日期外侧半角括号仍被测试锁定,维持原样。
4. 后续新页面直接遵循规格 v1.1 第 8 节增量约定(按钮层级/弹窗宽度归档/tooltip 列)。
