import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';

export type UserRole = 'Patient' | 'Staff' | 'Admin';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  token: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ── Storage helpers ───────────────────────────────────────────────────────────
// rememberMe=true  → localStorage (persists across browser restarts)
// rememberMe=false → sessionStorage (clears on tab close)
function store(key: string, value: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
  }
}
function retrieve(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}
function remove(key: string): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}
function decodeJwtPayload(token: string): any {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Invalid token');
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
  return JSON.parse(atob(padded));
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService, private router: Router) {}

  login(email: string, password: string, role: UserRole, rememberMe = false): Observable<any> {
    return this.api.login(email, password, role).pipe(
      tap((res: AuthUser) => {
        store(TOKEN_KEY, res.token, rememberMe);
        store(USER_KEY, JSON.stringify(res), rememberMe);
        // Fetch and cache avatar after login
        this.api.getUserProfile(res.id).subscribe({
          next: (profile) => {
            if (profile.avatar_url) {
              store('user_avatar', profile.avatar_url, rememberMe);
            } else {
              remove('user_avatar');
            }
          },
          error: () => {}
        });
      })
    );
  }

  googleLogin(credential: string): Observable<any> {
    return this.api.googleLogin(credential).pipe(
      tap((res: AuthUser & { avatar_url?: string }) => {
        // Google sign-in always uses sessionStorage (no rememberMe checkbox shown)
        store(TOKEN_KEY, res.token, false);
        store(USER_KEY, JSON.stringify(res), false);
        if (res.avatar_url) {
          store('user_avatar', res.avatar_url, false);
        } else {
          remove('user_avatar');
        }
      })
    );
  }

  register(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
  }): Observable<any> {
    return this.api.register(data);
  }

  resendVerification(email: string): Observable<any> {
    return this.api.resendVerification(email);
  }

  forgotPassword(email: string): Observable<any> {
    return this.api.forgotPassword(email);
  }

  validateResetToken(token: string): Observable<any> {
    return this.api.validateResetToken(token);
  }

  resetPassword(token: string, new_password: string): Observable<any> {
    return this.api.resetPassword(token, new_password);
  }

  logout(): void {
    remove(TOKEN_KEY);
    remove(USER_KEY);
    remove('user_avatar');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return retrieve(TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    const raw = retrieve(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Decode JWT payload to check expiry (no library needed — just base64 decode)
    try {
      const payload = decodeJwtPayload(token);
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        // Token expired — clear session silently
        remove(TOKEN_KEY);
        remove(USER_KEY);
        remove('user_avatar');
        return false;
      }
    } catch {
      // Malformed token — clear it
      remove(TOKEN_KEY);
      remove(USER_KEY);
      remove('user_avatar');
      return false;
    }

    return true;
  }

  getRole(): UserRole | null {
    return this.getUser()?.role ?? null;
  }

  /** Returns the correct dashboard route for the logged-in role */
  getDashboardRoute(): string {
    const role = this.getRole();
    if (role === 'Patient') return '/patient-dashboard';
    if (role === 'Staff') return '/staff-dashboard';
    if (role === 'Admin') return '/dentist-dashboard';
    return '/login';
  }
}
