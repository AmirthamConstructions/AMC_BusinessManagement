export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'admin' | 'accountant' | 'viewer';
  lastLoginAt?: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: User;
}
