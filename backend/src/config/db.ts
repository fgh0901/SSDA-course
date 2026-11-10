import mysql from 'mysql2/promise';
import { env } from './env';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      // DATE/DATETIME 直接返回 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm:ss' 字符串,
      // 与契约 1.4 的时间格式一致,避免时区换算偏差
      dateStrings: true
    });
    // 会话时区固定为东八区:过期/临期判定(CURDATE)、创建/更新时间戳
    // 均按北京时间,不随部署服务器时区漂移(本地 +8 / CI UTC 容器 / 云服务器一致)
    pool.on('connection', (conn) => {
      conn.query("SET time_zone = '+08:00'");
    });
  }
  return pool;
}

/** 可执行 SQL 的对象:连接池或事务连接 */
export type Exec = mysql.Pool | mysql.PoolConnection;

/** 参数化查询统一入口:禁止在调用方拼接 SQL 字符串 */
export async function query<T = unknown>(sql: string, params: unknown[] = [], exec?: Exec): Promise<T> {
  const [rows] = await (exec ?? getPool()).query(sql, params);
  return rows as T;
}

/** 查询单行,无结果返回 null */
export async function queryOne<T = unknown>(sql: string, params: unknown[] = [], exec?: Exec): Promise<T | null> {
  const rows = await query<T[]>(sql, params, exec);
  return rows.length > 0 ? rows[0] : null;
}

/** INSERT,返回自增主键 */
export async function insert(sql: string, params: unknown[] = [], exec?: Exec): Promise<number> {
  const [result] = await (exec ?? getPool()).query(sql, params);
  return (result as mysql.ResultSetHeader).insertId;
}

/** UPDATE / DELETE,返回受影响行数 */
export async function execute(sql: string, params: unknown[] = [], exec?: Exec): Promise<number> {
  const [result] = await (exec ?? getPool()).query(sql, params);
  return (result as mysql.ResultSetHeader).affectedRows;
}

/** 事务边界:业务层用此包裹"主表 + 变更日志"等多表写入 */
export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** 测试专用:关闭连接池 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
