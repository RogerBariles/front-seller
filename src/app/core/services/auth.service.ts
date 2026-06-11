import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { User, UserRole } from '../../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'pos_token';
  readonly currentUser = signal<User | null>(null);

  constructor(private api: ApiService, private router: Router) {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.api.me().subscribe({
        next: (user) => this.currentUser.set(user),
        error: () => this.logout()
      });
    }
  }

  login(username: string, password: string) {
    return this.api.login(username, password).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        this.currentUser.set(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }
}
