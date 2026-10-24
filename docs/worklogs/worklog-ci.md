# CI/CD 工程师任务书与工作日志

- Agent:CI/CD 工程师(backend-dev 角色延伸)
- 日期:2026-10-24
- 角色定义:.zcode/agents/ssda-backend-dev.md(环境与纪律生效)

## 任务书

### 目标
改造 `.github/workflows/ci.yml`,使其从"课程材料检查 + 条件探测(Node/Maven 双假设)"升级为匹配项目现状(Vue3 前端 / Express+TS+Jest 后端 / MySQL 8 依赖)的专用流水线,本地静态自检通过后按小步上库纪律提交。

### 交付物
1. `.github/workflows/ci.yml`:三 job 结构(课程材料 / frontend / backend),backend job 带 MySQL 8.0 service container 并预置全部后端环境变量
2. `docs/worklogs/worklog-ci.md`(本文件)

### 边界
- 只改 `.github/workflows/ci.yml` + 本 worklog;不碰 backend/ frontend/ db/ docs/design/
- 不改 backend 代码(env.ts 由另一 Agent 并行修改,流水线只做环境预置适配)
- 不 push;不本地跑 npm test(ssda_test 库另一 Agent 在用,避免冲突)
- 提交仅 `git add .github/ docs/worklogs/worklog-ci.md`,提交信息 `ci: adapt pipeline to vue3+express+mysql project (mysql service, backend env, dedicated jobs)`

## 节点记录

- [2026-10-24] 任务书创建;通读现状材料:旧 ci.yml(hashFiles 条件探测)、backend/tests/global-setup.js(向 ssda_test 执行 db/schema.sql,连 127.0.0.1:3306 root)、backend/jest.config.js、backend/src/config/env.ts(JWT_SECRET min(16) 必填、CORS_ORIGIN 已入 schema)、backend/.env.example、backend/tests/env.setup.ts(进程内再设 NODE_ENV/JWT_SECRET/DB_NAME)、frontend/backend package.json 与 package-lock.json(两份 lock 均在,vite outDir 默认 dist)。
- [2026-10-24] 【里程碑 1:流水线改造】重写 ci.yml:①触发 push/PR(main)+ workflow_dispatch 保留,新增 concurrency(同 ref 取消旧运行);②job1 course-materials 原样保留;③job2 frontend:Node 22 + setup-node npm 缓存(按 frontend/package-lock.json)→ npm ci/lint/test/build,产物 dist/ 上传 artifact(retention 7 天);④job3 backend:Node 22(缓存按 backend/package-lock.json)+ mysql:8.0 service container(MYSQL_ROOT_PASSWORD=root、MYSQL_DATABASE=ssda_test、mysqladmin ping 健康检查)→ mysql 客户端兜底 `CREATE DATABASE IF NOT EXISTS ssda_test utf8mb4`(幂等,与 globalSetup 口径一致)→ job 级 env 预置 DB_*/JWT_SECRET/NODE_ENV/CORS_ORIGIN → npm ci/lint/test/build;删除 Maven 假设与 hashFiles 条件步骤。
- [2026-10-24] 静态自检(YAML 逐行缩进核对、actions 版本核对、service 端口/环境变量与 env.ts 及 global-setup.js 逐字对照)通过,详见完成报告;提交完成(仅 .github/ + 本 worklog)。

## 完成报告

### 流水线结构
| Job | Runner | 内容 |
| --- | --- | --- |
| course-materials | ubuntu-latest | checkout + pwsh 校验课程 PDF/需求文档(保留原逻辑) |
| frontend | ubuntu-latest + Node 22 | npm ci → lint → test(Vitest)→ build(vue-tsc+vite)→ 上传 frontend-dist artifact |
| backend | ubuntu-latest + Node 22 + mysql:8.0 service | 等 MySQL 健康 → 建库兜底 → npm ci → lint → test(Jest,globalSetup 重建 ssda_test)→ build(tsc) |

### 关键设计决策
1. **三 job 拆分**:frontend/backend 失败互不连坐,状态一目了然;课程材料检查独立为 job1。
2. **MySQL service container**:镜像 mysql:8.0,`MYSQL_ROOT_PASSWORD=root` + `MYSQL_DATABASE=ssda_test`(容器启动即建库),`--health-cmd="mysqladmin ping -h 127.0.0.1 -uroot -proot"` + start-period 30s;另加 runner 侧等待循环 + `CREATE DATABASE IF NOT EXISTS ssda_test DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci` 兜底(幂等,即使 MYSQL_DATABASE 初始化有竞态也能保证库与字符集,与 global-setup.js 的建库语句逐字同口径)。
3. **缓存精度**:两个 job 各自 `cache-dependency-path` 指向本目录 package-lock.json(比两份合并哈希更精准,单侧依赖变更不会使另一侧缓存失效)。
4. **移除探测逻辑**:frontend/backend 的 lockfile 已存在,Maven 从未启用,hashFiles 条件步骤全部删除;npm 脚本不用 `--if-present`(scripts 已确认存在,脚本被误删时应响亮失败)。
5. **concurrency**:`group: ${{ github.workflow }}-${{ github.ref }}` + cancel-in-progress,同分支/同 PR 旧运行自动取消。
6. **不动 backend 代码**:env.ts 校验收严由后端 Agent 负责,流水线以 job 级 env 预置适配(见对照表);env.setup.ts 进程内再设 NODE_ENV/JWT_SECRET/DB_NAME 与 job 级值同口径,双保险。

### 与后端环境变量对照表(逐字核对)
| 环境变量 | env.ts(zod) | global-setup.js | CI 预置值 |
| --- | --- | --- | --- |
| NODE_ENV | enum,test 合法 | —(env.setup.ts 设 test) | `test` |
| DB_HOST | 默认 127.0.0.1 | 默认 127.0.0.1 | `127.0.0.1`(映射 3306:3306) |
| DB_PORT | 默认 3306 | 默认 3306 | `3306` |
| DB_USER | 默认 root | 默认 root | `root` |
| DB_PASSWORD | 默认 '' | 默认 '' | `root`(与 MYSQL_ROOT_PASSWORD 一致) |
| DB_NAME | 默认 ssda | 硬编码 ssda_test | `ssda_test` |
| JWT_SECRET | **必填 min(16)** | — | `ci-only-test-secret-0123456789`(30 字符) |
| JWT_EXPIRES_IN | 默认 12h | — | 不设(用默认) |
| CORS_ORIGIN | 默认 http://localhost:5173 | — | 显式预置 `http://localhost:5173` |
| DEEPSEEK_*/KB_* | optional/默认 | — | 不设(测试走降级/Mock) |

### 产出路径
- .github/workflows/ci.yml(重写)
- docs/worklogs/worklog-ci.md(本文件)

### 静态自检结果
1. YAML 缩进逐行核对:三 job 层级、steps/services/env 缩进、`options: >-` 折叠块、pwsh 多行 run 均正确。
2. actions 版本:checkout@v4 / setup-node@v4 / upload-artifact@v4,均当前主版本。
3. service 端口映射 `3306:3306` 与 DB_HOST=127.0.0.1/DB_PORT=3306 对应;健康检查命令含 -uroot -proot 与 MYSQL_ROOT_PASSWORD=root 逐字一致。
4. job3 环境变量与 global-setup.js 连接配置(host/port/user/password)及 env.ts 必填项(JWT_SECRET≥16)逐字对照通过;globalSetup 自行 CREATE DATABASE IF NOT EXISTS ssda_test(utf8mb4),与兜底建库步骤同口径。
5. 前端产物路径 frontend/dist/(vite 默认 outDir,配置未改)与 artifact path 一致;`if-no-files-found: error` 保证产物缺失即失败。
6. 提交范围核查:`git status` 确认另一 Agent 的 backend/ 未提交改动未被波及,仅 add .github/workflows/ci.yml 与本 worklog。

### 遗留问题与需总控决策事项
1. Actions 无法本地运行,首推后需在 GitHub Actions 页面确认三 job 全绿;若 MySQL service 初始化偶发超时,可将 start-period/重试参数调大。
2. frontend-dist artifact 仅保留 7 天(调试用途);如需部署流水线可复用 build 步骤。
