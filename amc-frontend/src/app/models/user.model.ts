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

/**
 * Safe user object returned by GET /api/users endpoints.
 * Internal fields (password, accountLocked, enabled, provider) are never included.
 */
export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  picture?: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Request body for POST /api/users (admin user creation) */
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  picture?: string;
  role?: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
}

/** Request body for PUT /api/users/{id} (admin user update) */
export interface UpdateUserRequest {
  name: string;
  phone?: string;
  picture?: string;
  role?: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  enabled?: boolean;
  accountLocked?: boolean;
}
