/**
 * Jest globalSetup:每次测试运行前重建 ssda_test 库表结构(执行 db/schema.sql)。
 * 测试不使用 seed,数据由用例自备、用后清理(ssda-testing 第 4/6 节)。
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = async function globalSetup() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    dateStrings: true
  });
  try {
    await conn.query(
      'CREATE DATABASE IF NOT EXISTS ssda_test DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'
    );
    // 读取仓库根 schema.sql,把目标库替换为 ssda_test(仅测试库,严禁触碰其他库)
    const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    schema = schema.replace('IF NOT EXISTS ssda ', 'IF NOT EXISTS ssda_test ').replace('USE ssda;', 'USE ssda_test;');
    if (!schema.includes('USE ssda_test;')) {
      throw new Error('globalSetup: schema.sql 目标库替换失败,拒绝继续执行');
    }
    await conn.query(schema);
  } finally {
    await conn.end();
  }
};
