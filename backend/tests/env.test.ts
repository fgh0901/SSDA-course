/**
 * 环境配置测试(体检修复 F1/审计 A-01:JWT_SECRET 去默认值,缺失/过短时启动即失败)
 */
// 屏蔽 .env 加载,精确模拟"新环境漏配"场景
jest.mock('dotenv/config', () => ({}));

const ORIGINAL_SECRET = process.env.JWT_SECRET;

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  }
  jest.resetModules();
});

describe('env 配置加载(F1:JWT_SECRET 必填 fail fast)', () => {
  it('JWT_SECRET 缺失:模块加载即抛错并指明字段(服务拒绝启动)', async () => {
    delete process.env.JWT_SECRET;
    jest.resetModules();
    let caught: unknown;
    try {
      await import('../src/config/env');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('JWT_SECRET');
  });

  it('JWT_SECRET 少于 16 字符:同样拒绝启动', async () => {
    process.env.JWT_SECRET = 'short-secret';
    jest.resetModules();
    await expect(import('../src/config/env')).rejects.toThrow(/JWT_SECRET/);
  });

  it('JWT_SECRET 合法配置:正常解析;CORS_ORIGIN 缺省为本地前端地址(F5)', async () => {
    process.env.JWT_SECRET = 'test-secret-test-secret-123456';
    jest.resetModules();
    const { env } = await import('../src/config/env');
    expect(env.JWT_SECRET).toBe('test-secret-test-secret-123456');
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173');
  });
});
