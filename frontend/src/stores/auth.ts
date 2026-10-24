import { ref } from 'vue';
import { defineStore } from 'pinia';
import { adminLogin } from '@/api/admin';
import { TOKEN_KEY } from '@/api/http';
import type { LoginResponse } from '@/types/admin';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '');
  const username = ref(localStorage.getItem('ssda_admin_username') ?? '');

  /** 登录成功持久化 token 与用户名(契约 3.1) */
  async function login(user: string, password: string): Promise<LoginResponse> {
    const data = await adminLogin({ username: user, password }); // 已解包
    token.value = data.token;
    username.value = data.admin.username;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem('ssda_admin_username', data.admin.username);
    return data;
  }

  function logout(): void {
    token.value = '';
    username.value = '';
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('ssda_admin_username');
  }

  return { token, username, login, logout };
});
