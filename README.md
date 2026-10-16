# 软件系统设计与应用（S）课程设计

本仓库用于保存课程设计的需求、设计、实现、测试和交付材料。

## 当前材料

- `《软件系统设计与应用S》课程设计实施 - p.pdf`：课程设计要求。
- `需求分析说明书.docx`：项目初期需求分析。

## 建议的代码目录

新增代码时建议采用以下结构；若最终技术栈或课程要求有变化，可相应调整：

```text
frontend/                 Vue 前端
backend/                  Spring Boot 或 Node.js 后端
database/                 数据库脚本
docs/                     设计、测试和部署文档
.github/workflows/ci.yml  持续集成
```

不要提交真实密钥、个人隐私数据或本地 `.env` 文件。需要示例配置时，提交不含真实值的 `.env.example`。

## Git 协作

从 `main` 创建功能分支，完成一项可审查的工作后提交并发起 Pull Request。提交说明使用清楚的动词，例如 `docs: add database design`、`feat: implement knowledge search`、`test: cover login validation`。

```powershell
git switch -c feat/short-description
git add <files>
git commit -m "feat: describe the change"
git push -u origin feat/short-description
```

## 持续集成

GitHub Actions 工作流在推送到 `main`、针对 `main` 创建 Pull Request，以及手动触发时运行。当前会检查课程材料；添加代码后，工作流会根据项目文件运行相应步骤：

- 检测到 `frontend/package-lock.json` 时，执行 `npm ci`，并运行已定义的 lint、test 和 build 脚本。
- 检测到 `backend/package-lock.json` 时，对 Node.js 后端执行同样的检查。
- 检测到 `backend/pom.xml` 时，使用 Java 21 执行 Maven `verify`。

请将各项目的锁文件和 Maven 配置提交到仓库，以便 CI 使用与本地一致的依赖版本。
