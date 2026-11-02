# 工作日志 - 数据研究员 A(新生入学公开信息采集)

日期:2026-11-02
执行人:数据研究员 A(Agent)

## 一、任务书

- 目标:通过网络检索采集西南交通大学新生入学相关的**真实公开信息**,产出可直接转写为数据库记录的采集底稿 `docs/report/采集底稿-A.md`。
- 范围(A 组三主题):
  1. 入学事务(目标 ≥12 条,目标表 knowledge):报到流程/时间地点、军训、大学生医保、户口迁移、党团组织关系转接、绿色通道与助学贷款、新生体检、宿舍入住、教材领取等;
  2. 校园卡与网络服务(目标 ≥10 条,目标表 knowledge 或 service_guide):熊猫卡(一卡通)功能/办理/挂失/补办、校园网认证与资费、VPN、学生邮箱;有办理地点/材料/流程的做办事指南(service_guide)条目;
  3. 安全须知(目标 ≥5 条,目标表 knowledge):防电信诈骗、消防、用电、交通、防盗,优先保卫处/平安交大官方发布。
- 铁律:
  - 禁止编造,每条信息必须来自实际检索/打开过的网页;查不到的主题直接跳过;
  - 来源分级:swjtu.edu.cn 域官方页面 → official;仅学生社区 Wiki(wiki.swjtu.top)→ community;两者都没有 → 不录;
  - 只采集与结构化,不写 SQL、不改任何代码。
- 提交约定:小步提交 `docs(report): 采集底稿A(入学事务/校园卡网络/安全须知)`,只 add 底稿与本人 worklog。

## 二、检索记录

| # | 检索词 / URL | 结果摘要 | 采条情况 |
|---|---|---|---|
| 1 | WebSearch:西南交通大学 新生 军训 安排 通知 | 学工部通知:报到9月11-12、军训9月13-26 | K-A4 |
| 2 | WebFetch: hospital.swjtu.edu.cn/info/1009/6918.htm | 2026级新生体检通知全文 | K-A6 |
| 3 | WebSearch:新生 党组织关系 团组织关系 转接 | 信通学院/公管学院党员、团员转接通知 | K-A8、K-A9 |
| 4 | WebSearch:大学生城乡居民基本医疗保险 参保 缴费 | 校医院2026年度448元/人、缴费渠道 | K-A7 |
| 5 | WebSearch:新生 绿色通道 助学贷款 资助(两次交叉) | 迎新绿色通道、学费缓缴、生源地贷款回执 | K-A10 |
| 6 | WebFetch: wiki.swjtu.top/zh-CN/docs/freshman/introduction/ 与 dormitories/ | 社区Wiki报到指南、宿舍购电报修 | K-A1交叉、K-A12 |
| 7 | WebFetch: ygb.swjtu.edu.cn/info/2331/6901.htm | 2026迎新工作通知全文(预报到/接待点/物品领取) | K-A1~A3、K-A10 |
| 8 | WebSearch:保卫处 新生 户口 + WebFetch: bwc.swjtu.edu.cn(/tzgg.htm) | 《新生入户须知》(2026-09-03)、军训服装发放通知 | K-A11、K-A5 |
| 9 | WebSearch:新生 教材 领取 教材科 | 教务处教材服务中心(犀浦2教,028-66366256) | K-A13 |
| 10 | WebFetch: inc.swjtu.edu.cn/wlfw/xyykt.htm | 一卡通服务页(功能/办理/充值/网点) | K-A14、S-A1 |
| 11 | WebSearch:校园网 认证 资费 + WebFetch: inc.swjtu.edu.cn/wlfw/xywzh.htm | 校园网开户流程、材料、计费规则 | K-A17、S-A2 |
| 12 | WebFetch: wiki.swjtu.top campus-services/network/ 与 campus-card/ | 社区Wiki交大ID、一卡通、企业微信 | K-A19、K-A21 |
| 13 | WebFetch: inc.swjtu.edu.cn/wlfw/wxsw.htm、VPNfw.htm、jdyx.htm、info/1011/2095.htm | SWJTU-WiFi、VPN、学生邮箱、eduroam 官方页 | K-A16、K-A18、S-A3、K-A22 |
| 14 | WebSearch:一卡通 自助 挂失 圈存机 | card.swjtu.edu.cn 改密码通知(1022/1695);"熊猫卡"无官方出处 | K-A15 |
| 15 | WebFetch: bwc.swjtu.edu.cn/aqjs.htm + curl 提取文章URL | 安全警示栏目:《防范诈骗小课堂》系列等 | K-A23 |
| 16 | WebFetch: bwc.swjtu.edu.cn/info/1290/5556、5546、5566.htm | 防盗、防火、交通安全三篇警示案例 | K-A24、K-A25、K-A27 |
| 17 | WebSearch:宿舍 用电安全 消防 违规电器 + curl 验证 | 各学院用电白名单/红线/检查制度 | K-A26 |
| 18 | WebFetch: wiki campus-services/safety/ + curl 验证 bwc 首页 | 24小时报警电话 66366110/87600110 官网核实 | K-A28 |
| 19 | WebSearch:"平安交大" + news.swjtu.edu.cn/info/4945/81775.htm | 平安交大系列活动、安全生产网格信息牌 | K-A29 |

放弃项:xg.swjtu.edu.cn 办事流程详情页(ECONNREFUSED,仅用搜索摘要+学院通知交叉);校园网资费金额(页面为图片);户口迁移材料明细(详情页直链未获取);"熊猫卡"称呼(无官方出处,不单独成条)。

## 三、完成报告

- 产出:`docs/report/采集底稿-A.md`,共 32 条(入学事务 13、校园卡与网络服务 12[含办事指南3条]、安全须知 7)。
- 级别分布:official 28 条,community 4 条(宿舍信息、交大ID、云盘、企业微信,均出自 wiki.swjtu.top 并附官方口径页面)。
- 放弃主题及原因:一卡通挂失补办细则、校园网报修独立条目、到校交通接站、邮箱/云盘配额——官方渠道查不到或不可达,未编造,已并入相关条目并标注。
- 需人工核实项:7 项,已在底稿末尾汇总(熊猫卡称呼、挂失细则、资费金额、户口材料明细、绿色通道受理点、东/峨校区报警电话、年份数字泛化)。
