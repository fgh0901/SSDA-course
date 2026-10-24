/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/env.setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.js',
  clearMocks: true,
  testTimeout: 15000,
  // mysql2 连接池持有 TCP 句柄;afterAll 已做数据清理,此处强制退出进程
  forceExit: true,
};
