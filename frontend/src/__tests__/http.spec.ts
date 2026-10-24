import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

const { elMessageError } = vi.hoisted(() => ({ elMessageError: vi.fn() }));
vi.mock('element-plus', () => ({
  ElMessage: { error: elMessageError, success: vi.fn(), warning: vi.fn() }
}));

import http, { TOKEN_KEY } from '@/api/http';
import type { ApiError } from '@/types/api';

// 响应包解包拦截器(契约 1.1:成功返回 data;失败 ElMessage.error 并 reject;401 清 token 跳登录)
function setAdapter(
  handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>
): void {
  http.defaults.adapter = handler;
}

function ok(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: 'OK', headers: {}, config };
}

function failWith(
  config: InternalAxiosRequestConfig,
  body: unknown,
  status: number
): AxiosError {
  const response = { data: body, status, statusText: 'Error', headers: {}, config } as AxiosResponse;
  return new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, undefined, response);
}

beforeEach(() => {
  elMessageError.mockClear();
  localStorage.clear();
});

describe('axios 响应拦截器(响应包解包)', () => {
  it('成功响应解包:直接返回 data 字段', async () => {
    setAdapter(async (config) => ok(config, { success: true, data: { list: [1], total: 1 } }));
    const data = await http.get('/demo');
    expect(data).toEqual({ list: [1], total: 1 });
    expect(elMessageError).not.toHaveBeenCalled();
  });

  it('HTTP 200 但 success=false:弹出 error.message 并以 error 对象 reject', async () => {
    const errBody: ApiError = { code: 'VALIDATION_ERROR', message: '标题不能为空' };
    setAdapter(async (config) => ok(config, { success: false, error: errBody }));
    await expect(http.get('/demo')).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: '标题不能为空' });
    expect(elMessageError).toHaveBeenCalledWith('标题不能为空');
  });

  it('401(会话失效):清空 token 并提示重新登录', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    setAdapter(async (config) => {
      throw failWith(config, { success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } }, 401);
    });
    await expect(http.get('/admin/knowledge')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(elMessageError).toHaveBeenCalledWith('登录已失效,请重新登录');
  });

  it('401(登录接口密码错误):展示后端 message,不清 token 不跳转', async () => {
    localStorage.setItem(TOKEN_KEY, 'old-token');
    setAdapter(async (config) => {
      throw failWith(config, { success: false, error: { code: 'UNAUTHORIZED', message: '用户名或密码错误' } }, 401);
    });
    await expect(http.post('/admin/auth/login', { username: 'admin', password: 'bad' })).rejects.toMatchObject({
      message: '用户名或密码错误'
    });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('old-token');
    expect(elMessageError).toHaveBeenCalledWith('用户名或密码错误');
  });

  it('403:提示无权限', async () => {
    setAdapter(async (config) => {
      throw failWith(config, { success: false, error: { code: 'FORBIDDEN', message: '无权限' } }, 403);
    });
    await expect(http.get('/admin/knowledge')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(elMessageError).toHaveBeenCalledWith('无权限执行该操作');
  });

  it('500(数据库不可用):展示统一话术"系统繁忙,请稍后重试",不泄露堆栈(TC-10)', async () => {
    setAdapter(async (config) => {
      throw failWith(
        config,
        { success: false, error: { code: 'INTERNAL_ERROR', message: '系统繁忙,请稍后重试' } },
        500
      );
    });
    await expect(http.get('/knowledge')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(elMessageError).toHaveBeenCalledWith('系统繁忙,请稍后重试');
  });

  it('网络异常无响应体:兜底提示统一话术', async () => {
    setAdapter(async (config) => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    });
    await expect(http.get('/knowledge')).rejects.toBeTruthy();
    expect(elMessageError).toHaveBeenCalledWith('系统繁忙,请稍后重试');
  });

  it('请求拦截器:携带本地 token 作为 Bearer 头', async () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-token');
    let seenAuth = '';
    setAdapter(async (config) => {
      seenAuth = String(config.headers.Authorization ?? '');
      return ok(config, { success: true, data: {} });
    });
    await http.get('/admin/knowledge');
    expect(seenAuth).toBe('Bearer jwt-token');
  });
});
