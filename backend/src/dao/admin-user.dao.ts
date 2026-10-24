import { execute, queryOne } from '../config/db';

export interface AdminUserRow {
  id: number;
  username: string;
  passwordHash: string;
  role: string;
}

export async function findByUsername(username: string): Promise<AdminUserRow | null> {
  return queryOne<AdminUserRow>(
    'SELECT id, username, password_hash AS passwordHash, role FROM admin_user WHERE username = ?',
    [username]
  );
}

export async function updateLastLogin(id: number): Promise<number> {
  return execute('UPDATE admin_user SET last_login_at = NOW() WHERE id = ?', [id]);
}
