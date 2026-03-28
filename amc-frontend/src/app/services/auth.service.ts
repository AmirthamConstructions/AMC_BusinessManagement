import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest, ChangePasswordRequest } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'amc_token';
const REFRESH_TOKEN_KEY = 'amc_refresh_token';
const USER_KEY = 'amc_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);
  private apiUrl = environment.apiUrl + '/auth';

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, request).pipe(
      map(res => res.data),
      tap(authResponse => this.handleAuthResponse(authResponse))
    );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, request).pipe(
      map(res => res.data),
      tap(authResponse => this.handleAuthResponse(authResponse))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      map(res => res.data),
      tap(authResponse => this.handleAuthResponse(authResponse))
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/me`).pipe(
      map(res => res.data),
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  changePassword(request: ChangePasswordRequest): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/change-password`, request).pipe(
      map(res => res.data)
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && this.currentUser() !== null;
  }

  getUser(): User | null {
    return this.currentUser();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }

  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (userJson && token) {
      try {
        const user: User = JSON.parse(userJson);
        this.currentUser.set(user);
      } catch {
        this.clearSession();
      }
    }
  }
}
