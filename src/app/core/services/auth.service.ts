import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { User, UserRole } from '../../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'pos_token';
  private readonly userKey = 'pos_user';
  private readonly tokenSavedAtKey = 'pos_token_saved_at';
  private readonly tokenTtlMs = 6 * 60 * 60 * 1000; // 6 hours
  currentUser = signal<User | null>(null);

  constructor(private api: ApiService, private router: Router) {
    const token = this.getToken();
    if (token) {
      this.currentUser.set(this.getUserFromStorage());
    }
  }

  login(username: string, password: string) {
    return this.api.login(username, password).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        localStorage.setItem(this.tokenSavedAtKey, String(Date.now()));
        this.currentUser.set(response.user);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    if (this.isTokenExpired()) {
      this.clearSession();
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }

  private isTokenExpired(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return false;
    }

    const savedAt = Number(localStorage.getItem(this.tokenSavedAtKey));
    if (!savedAt || Number.isNaN(savedAt)) {
      return true;
    }

    return Date.now() - savedAt >= this.tokenTtlMs;
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenSavedAtKey);
    this.currentUser.set(null);
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }
}
