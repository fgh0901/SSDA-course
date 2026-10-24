import axios from 'axios';
import { ElMessage } from 'element-plus';
import type { ApiError } from '@/types/api';

export const TOKEN_KEY = 'ssda_token';

const http = axios.create({ baseURL: '/api', timeout: 10000 });

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/** 401 时清 token 并跳管理端登录页(契约 1.6 / TC-07) */
function handleUnauthorized(): void {
  localStorage.removeItem(TOKEN_KEY);
  void import('@/router').then(({ default: router }) => {
    if (window.location.pathname !== '/admin/login') {
      router.push({
        path: '/admin/login',
        query: { redirect: window.location.pathname + window.location.search }
      });
    }
  });
}

http.interceptors.response.use(
  (resp) => {
    // 文件流(如 AI 日志 JSONL 导出)不走响应包解包,原样返回
    if (resp.config.responseType === 'blob' || !(resp.data instanceof Object)) {
      return resp.data;
    }
    const body = resp.data as { success: boolean; data?: unknown; error?: ApiError };
    if (body.success) return body.data; // 解包:调用方只拿业务 data
    ElMessage.error(body.error?.message ?? '请求失败');
    return Promise.reject(body.error);
  },
  (err) => {
    const status = err.response?.status as number | undefined;
    const apiError: ApiError = err.response?.data?.error ?? { code: 'INTERNAL_ERROR', message: '系统繁忙,请稍后重试' };
    const isLoginRequest = String(err.config?.url ?? '').includes('/admin/auth/login');
    if (status === 401 && isLoginRequest) {
      // 登录密码错误:展示后端"用户名或密码错误",不跳转(契约 3.1)
      ElMessage.error(apiError.message);
    } else if (status === 401) {
      handleUnauthorized();
      ElMessage.error('登录已失效,请重新登录');
    } else if (status === 403) {
      ElMessage.error('无权限执行该操作');
    } else if (err.config?.responseType !== 'blob') {
      ElMessage.error(apiError.message);
    }
    // 文件流请求(如 AI 日志导出)不在此弹错:调用方按业务给"具体原因"的导出反馈(D-MED-3),避免重复提示
    return Promise.reject(apiError);
  }
);

export default http;
