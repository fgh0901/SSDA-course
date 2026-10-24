---
name: ssda-ai-log
description: SSDA 项目的 AI 使用日志规范(课程硬性要求:每阶段提交 AI 使用日志)。凡是涉及系统内 AI 对话数据落库(ai_chat_session/ai_chat_message)、编写或补录开发过程 AI 使用日志、执行 npm run export:ai-logs 导出、阶段提交材料核对、AI 合规性(可解释/鲁棒/公平/隐私)检查的任务,全体 Agent 都必须先使用本 skill。
---

# ssda-ai-log:AI 日志双轨制规范

目标读者:全体 Agent(不止开发)。本课程设计要求"每阶段提交 AI 使用日志",并要求系统内 AI 组件合规。读完本文件,你应知道两轨日志分别记在哪、格式是什么、由谁维护。

## 1. 双轨制总览

| 轨道 | 内容 | 载体 | 谁写入 |
|---|---|---|---|
| 轨道①:系统内 AI 对话 | 学生使用系统时与 AI 助手的真实对话 | 数据库表 `ai_chat_session`、`ai_chat_message`(代码自动落库) | 后端 AI 模块 |
| 轨道②:开发过程 AI 使用日志 | 我们开发本项目过程中对 AI 工具(含 ZCode 等 Agent)的使用记录 | `docs/ai-logs/dev-usage-log.md` | 每个 Agent 人工追加 |

两轨独立,**互不替代**:轨道①服务于产品功能与合规审计,轨道②服务于课程要求的阶段提交。

## 2. 轨道①:系统内对话落库约定

- 相关表(11 个数据实体中的 AI 日志组):`ai_chat_session`(会话)、`ai_chat_message`(逐条消息)。
- **隐私红线**:仅使用匿名 sessionId(uuid),不收集姓名、学号等个人身份信息;不做用户画像。
- **可解释**:AI 回答必须基于 `KnowledgeRetriever` 检索到的知识库内容,并在消息中保留来源引用(sources)。
- **鲁棒(降级留痕)**:LLM 超时/异常时走本地检索 + 模板化回答并明确提示;该消息需标记来源类型,便于区分"大模型生成"与"降级模板"。检索不到可信内容时提示"请核实",禁止编造。
- 后端实现细节见 `ssda-backend` 第 9 节;管理端查看/导出入口:`GET /api/admin/ai-logs`、`?export=1`。

## 3. 轨道②:开发过程 AI 使用日志

### 3.1 目录格式约定

```text
docs/ai-logs/
├── dev-usage-log.md     # 主台账:按阶段分节,一行(或一卡)一条使用记录
├── prompts/             # 关键提示词存档,文件名 kebab-case 加版本号
│   └── ai-chat-system-prompt-v1.md
└── exports/             # npm run export:ai-logs 导出的系统内对话(见第 4 节)
```

- 主台账只此一份,**追加不重写**;每阶段一节,节内表格按时间排序。
- 提示词超过 3 行的,正文只写要点,全文存 `prompts/` 并在表格里链接。

### 3.2a 提示词存档文件模板(prompts/ 下)

```markdown
# AI 问答系统提示词 v1
- 用途:POST /api/ai/chat 的 system prompt
- 首次启用:2026-XX-XX;状态:启用中(替代版本:v0,原因:未约束来源引用)
- 关联需求:FR-13

## 正文
你是校园知识库助手。回答规则:
1. 仅依据检索到的知识条目回答,并逐条列出来源(标题 + 更新时间);
2. 检索不到可信内容时,回答"暂无可靠信息,建议咨询 XX 部门核实",禁止编造;
3. 不收集、不询问用户个人身份信息;
4. 对无法确认有效期的信息,提示用户核实。

## 变更记录
- v1:新增"禁止编造"与来源引用约束(合规自查第 3 条)
```

每个版本一个文件,禁止原地改写已启用过的提示词;新版本在台账新增一行记录变更原因。

### 3.2 dev-usage-log.md 单条记录模板

```markdown
## 阶段 N:<阶段名>(YYYY-MM-DD ~ YYYY-MM-DD)

| 日期 | 工具/模型 | 目的 | 提示词要点 | 产出 | 人工修改 | 备注 |
|---|---|---|---|---|---|---|
| 10-24 | ZCode(GLM) | 生成知识列表接口骨架 | 引用 ssda-backend;要求 zod+参数化 SQL | controller/dao 代码 | 调整分页默认值;补单测 | 见 PR/commit |
| 10-24 | DeepSeek API | 联调 /api/ai/chat 提示词 | 系统提示词见 prompts/ai-chat-system-prompt-v1.md | 降级话术确认 | 改写免责声明文案 | 属系统功能,对话另落 ai_chat_* |
```

字段口径:**工具/模型**(用了什么)、**目的**(为什么用)、**提示词要点**(怎么用的,关键约束)、**产出**(得到什么,给路径/commit)、**人工修改**(人工改了哪些——体现"AI 辅助、人负责")。

### 3.3 各 Agent 的写入时机

- 完成任一由 AI 辅助的任务节点后**当天**追加记录;阶段收尾时补全并自查本阶段无漏记。
- 记录与 `docs/worklogs/worklog-<agent>.md` 的对应节点可互相引用(写"见 worklog 第 x 节"),但 AI 使用记录本身必须在本台账。

## 4. 系统内对话导出:`npm run export:ai-logs`(脚本见 4a 节)

- 位置:后端 `package.json` scripts,如 `"export:ai-logs": "tsx src/scripts/export-ai-logs.ts"`(本项目用 tsx,不用 ts-node)。
- 行为:读取 `ai_chat_session` + `ai_chat_message`,输出到 `docs/ai-logs/exports/ai-chat-export-YYYYMMDD-HHmm.jsonl`。
- 格式:**每行一个 JSON 对象**,字段如下(与表结构对应,snake_case 在导出层转 camelCase):

```json
{"sessionId":"uuid","role":"user|assistant","content":"…","sources":[{"type":"knowledge","id":12,"title":"校园卡补办"}],"mode":"deepseek|fallback","createdAt":"2026-10-24 10:00:00"}
```

- `mode=fallback` 的行即降级回答,便于统计降级率(鲁棒性证据)。
- 导出文件**不入 git**(加入 `.gitignore:docs/ai-logs/exports/`),提交材料时单独打包;如需入档先脱敏。
- 导出脚本核心逻辑参考(实现方按此口径对齐,细节可调):

```ts
// backend/scripts/export-ai-logs.ts(要点示意)
const [sessions] = await pool.query('SELECT id, session_id, created_at FROM ai_chat_session');
const [messages] = await pool.query(
  'SELECT session_id, role, content, sources, mode, created_at FROM ai_chat_message ORDER BY created_at'
);
// 逐行写 JSONL;文件名 docs/ai-logs/exports/ai-chat-export-<YYYYMMDD-HHmm>.jsonl
// 结束后在控制台输出:总条数、fallback 条数(降级率)
```

## 4a. 阶段提交材料对照(和课程要求挂钩)

| 阶段要求 | 证据来源 | 负责人 |
|---|---|---|
| 每阶段提交 AI 使用日志 | `docs/ai-logs/dev-usage-log.md` 对应阶段小节 | 各 Agent 追加,总控汇总 |
| 系统内 AI 对话数据展示 | `docs/ai-logs/exports/` 导出包(阶段内任一代表性时间段) | 后端 Agent 生成 |
| AI 合规性说明(可解释/鲁棒/公平/隐私) | 第 5 节合规自查清单逐条勾选结果 | AI 模块开发 Agent |
| 提示词可追溯 | `docs/ai-logs/prompts/` 版本链 | AI 模块开发 Agent |

## 5. 合规自查清单(阶段提交前核对)

- [ ] dev-usage-log.md 本阶段记录完整(工具/目的/提示词要点/产出/人工修改五要素齐全)
- [ ] 关键提示词已存档到 `docs/ai-logs/prompts/` 且带版本
- [ ] AI 回答均附知识来源;无来源时明确"待核实"话术
- [ ] 降级路径可用且消息标记 `fallback`
- [ ] 仅匿名 sessionId;日志与导出中无个人身份信息、无密钥
- [ ] `DEEPSEEK_API_KEY` 未出现在任何日志、提示词存档、导出文件中

## 6. Do / Don't

**Do**

- 用了 AI 就记,宁可多记一条也不要事后补造
- 系统功能型 AI 对话(学生问答)在台账里也留一行说明,并注明"详细数据见 ai_chat_* 导出"
- 阶段报告引用本台账作为 AI 使用合规证据

**Don't**

- 禁止编造、批量补写日志(违背课程要求,后果由个人承担)
- 禁止把用户私有内容、密钥、token 写进任何日志文件
- 禁止绕过 `ai_chat_*` 表直接把对话写文件充当"系统日志"
- 禁止修改本目录既有历史记录(发现错误用"勘误"行标注)

## 7. 常见问题(FAQ)

- **问:我调 ZCode 写代码,也要记进 dev-usage-log.md 吗?**
  答:要。轨道②记录的是"开发过程使用 AI"这一行为,与工具无关;ZCode、ChatGPT、DeepSeek 网页版等都算。
- **问:学生和 AI 助手的对话要不要写进 dev-usage-log.md?**
  答:不逐条记录,它们自动落 `ai_chat_*` 表(轨道①);但如果你为了调通该功能做了提示词实验,这些**开发侧实验**要记台账。
- **问:一次对话用了两个模型(先 DeepSeek 后降级),怎么记?**
  答:台账一行记主过程,备注注明降级;系统内该消息 `mode=fallback` 自然留痕。
- **问:提示词只改了一个标点,要发新版本吗?**
  答:改动词义/约束必须新版本;纯错别字可在当前版本"变更记录"里补一行勘误。

## 8. 协作约束

本 skill 由全体 Agent 共用;目录结构或导出格式如需调整,在完成报告中提请总控裁决,不得私自变更字段口径。课程要求原文以《软件系统设计与应用》课程设计实施文件与简报第 1 节为准。
