export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  picture?: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  provider?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
