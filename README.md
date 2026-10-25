# 软件系统设计与应用课程设计

本仓库用于管理课程设计项目资料并开展团队协作，记录需求分析、系统设计、开发实现和测试部署过程。

## 项目文档

- `《软件系统设计与应用S》课程设计实施 - p.pdf`:课程设计要求。
- `需求分析说明书2.0.docx`:当前需求分析版本。
- `需求分析说明书.docx`:前期版本,保留用于记录需求修订过程。
- `系统设计报告.docx` / `系统设计报告.pdf`:系统设计报告(架构/数据库/接口/AI 组件/前端/安全/部署设计)。
- `docs/report/`:课程文档汇总(测试报告、模型评估报告、项目计划、迭代计划与改进记录、部署文档、监控方案、周报),`docs/report/docx/` 为对应 Word 版,`docs/report/images/` 为设计图源图。
- `docs/design/`:设计过程文档(项目简报、API 契约、系统设计、AI 组件设计、页面规格、UI 设计规格)。
- `docs/test/`、`docs/audits/`、`docs/testing/`:测试与审计过程材料;`docs/worklogs/`:各 Agent 工作日志;`docs/ai-logs/`:AI 使用日志(课程考核要求)。

## 分支与提交

`main` 用于保存已集成的项目版本。功能开发在独立分支进行,完成后通过本地合并进入 `main`;采用小步提交纪律(Conventional Commits,提交说明可用中文简述变更)。

## 持续集成

GitHub Actions 工作流位于 `.github/workflows/ci.yml`,在推送到 `main`、针对 `main` 创建 Pull Request 或手动触发时运行,包含三个作业:课程材料检查、前端检查(lint/test/build + 产物上传)、后端检查(内置 MySQL 8.0 服务容器,运行 lint/test/build)。

## 快速启动

前提:MySQL 8.0 与 Node.js 22+。

```bash
# 1. 初始化数据库(建库 ssda + 灌入演示数据;会覆盖已有同名库数据)
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql

# 2. 配置并启动后端(端口 3000)
cd backend
cp .env.example .env        # 修改 DB_PASSWORD 为本机 root 密码;JWT_SECRET 换成 ≥16 位随机串
npm install
npm run dev

# 3. 启动前端(端口 5173,已配置 /api 代理到 3000)
cd ../frontend
npm install
npm run dev
```

访问 http://localhost:5173/ (学生端);管理端 http://localhost:5173/admin/login(账号见下方安全提示)。AI 对话可选配置 DeepSeek:在 `backend/.env` 填入 `DEEPSEEK_API_KEY` 后重启后端即切换为模型生成,未配置时自动走本地检索降级模式。

## 安全提示

`db/seed.sql` 预置管理员账号 `admin / admin123`，仅用于课程演示环境。演示或部署前请：修改 `backend/.env` 中的 `JWT_SECRET`（勿使用示例值），并通过管理端或脚本修改管理员密码。
