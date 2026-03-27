import { Injectable, signal } from '@angular/core';
import { User, AuthResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);

  // Hardcoded user for now
  private mockUser: User = {
    id: '664a1f001',
    email: 'admin@amirtham.com',
    name: 'Manimaran',
    picture: '',
    role: 'admin',
    lastLoginAt: '2026-03-28T10:00:00.000Z'
  };

  login(): AuthResponse {
    this.currentUser.set(this.mockUser);
    return { token: 'mock-jwt-token', expiresIn: 28800, user: this.mockUser };
  }

  logout(): void {
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  getUser(): User | null {
    return this.currentUser();
  }

  // Auto-login for dev
  autoLogin(): void {
    this.currentUser.set(this.mockUser);
  }
}
