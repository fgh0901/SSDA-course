# 子 Agent 工作日志(监控通道)

本目录是各子 Agent 的工作日志落盘点,用户可随时打开查看任意 Agent 的开发过程;同时所有子 Agent 以后台任务方式运行,可在 ZCode 任务面板(`/tasks`)实时观看流式输出。

## 日志文件与 Agent 对应

| 文件 | Agent | 状态 |
|---|---|---|
| worklog-orchestrator.md | 总控(统筹、评审、集成) | 进行中 |
| worklog-skill-engineer.md | 技能工程师(本地 skills 创建与迭代) | 进行中 |
| worklog-requirements.md | 需求与设计 Agent | 未开工 |
| worklog-backend.md | 后端 Agent | 未开工 |
| worklog-frontend.md | 前端 Agent | 未开工 |
| worklog-tester.md | 测试与审计 Agent | 未开工 |

## 日志格式约定

1. **任务书**(开工第一件事):目标 / 范围 / 允许改动的文件 / 预期产出
2. **过程节点**:每完成一个有意义的步骤追加 `## [时间戳] 节点标题`,记录:做了什么、产出路径、遇到的问题与决策
3. **完成报告**(收尾):已完成清单 / 产出物路径 / 自测情况 / 遗留问题 / 需要总控决策的事项

## 规则

- 子 Agent 只写自己的日志文件与被授权的产出物,不修改契约与其他 Agent 的文件
- 契约变更请求写入自己的完成报告,由总控裁决后统一修订
- 日志随代码一并提交,兼作课程过程考核材料
