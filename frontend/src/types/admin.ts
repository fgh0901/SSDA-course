// 管理员登录(契约 3.1)
export interface AdminInfo {
  id: number;
  username: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  admin: AdminInfo;
}

export interface LoginPayload {
  username: string;
  password: string;
}
