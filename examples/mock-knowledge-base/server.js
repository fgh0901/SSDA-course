/**
 * 模拟外部知识库(演示用):独立于本项目的"别人家的知识库"。
 * 数据故意选用本地 ssda 库中没有的话题,用于验证检索确实走了外部知识库。
 * 启动:node examples/mock-knowledge-base/server.js(默认端口 9500)
 * 接口:POST /retrieve {question, topK} → {items:[{id,title,snippet,source,updatedAt}]}
 *       GET  /health → {status:"up"}
 */
const http = require('http');

const KB_NAME = '迎新服务知识库(外部演示库)';
const ENTRIES = [
  {
    id: 101,
    title: '2026 级新生军训安排',
    snippet: '军训时间:开学第一周至第三周(9 月 1 日至 9 月 19 日),每日 8:00-11:30、14:00-17:30。需自备运动鞋、水杯,迷彩服由学校统一发放。特殊情况可凭医院证明申请见习。',
    source: '武装部 2026 年迎新通知',
    updatedAt: '2026-08-20 09:00:00',
    keywords: ['军训', '迷彩', '见习', '武装部']
  },
  {
    id: 102,
    title: '大学生医保参保指南',
    snippet: '新生医保在入学后统一组织参保,每年缴费 380 元,9 月 30 日前通过"校财务服务平台"线上缴纳。参保后就医持社保卡结算,校医院首诊报销比例 90%。',
    source: '校医院医保办',
    updatedAt: '2026-08-28 14:30:00',
    keywords: ['医保', '参保', '社保卡', '报销', '缴费']
  },
  {
    id: 103,
    title: '新生户口迁移办理说明',
    snippet: '户口迁移遵循自愿原则。需迁移者持录取通知书、户口簿、身份证到户籍所在地派出所办理《户口迁移证》,入学报到时交至保卫处户籍室,截止日期为 10 月 31 日。',
    source: '保卫处户籍室',
    updatedAt: '2026-09-01 16:00:00',
    keywords: ['户口', '户籍', '迁移', '迁移证', '保卫处']
  },
  {
    id: 104,
    title: '大学英语分级考试须知',
    snippet: '全体本科新生须参加英语分级考试,机考 90 分钟,内容含听力、阅读与写作。考试安排在报到后第二周周末,具体考场以教务系统公告为准,成绩决定英语课分班。',
    source: '教务处教学服务中心',
    updatedAt: '2026-09-05 11:00:00',
    keywords: ['英语', '分级', '分级考试', '机考', '教务']
  }
];

function search(question, topK) {
  const scored = ENTRIES.map((e) => {
    let score = 0;
    for (const kw of [e.title, ...e.keywords]) {
      if (question.includes(kw)) score += kw.length >= 3 ? 3 : 2;
    }
    // 逐字兜底:问题中任一字符命中标题也计 1 分
    for (const ch of question) {
      if (e.title.includes(ch)) score += 0.5;
    }
    return { entry: e, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored.map(({ entry }) => ({
    id: entry.id,
    title: entry.title,
    snippet: entry.snippet,
    source: `${entry.source}(${KB_NAME})`,
    updatedAt: entry.updatedAt
  }));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'up', name: KB_NAME }));
    return;
  }
  if (req.method === 'POST' && req.url === '/retrieve') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { question, topK } = JSON.parse(body || '{}');
        const items = search(String(question || ''), Number(topK) || 5);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ items }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad request' }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(9500, () => {
  console.log('[mock-kb] 外部演示知识库已启动: http://localhost:9500 (POST /retrieve, GET /health)');
});
