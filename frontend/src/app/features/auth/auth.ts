import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  http = inject(HttpClient);
  private readonly _isLoggedIn = signal<boolean>(false);
  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  private readonly _token = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  readonly token = this._token.asReadonly();

  login(credentials: LoginModel) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/token/`, credentials).pipe(
      tap((response) => {
        if ('requires2FA' in response) {
          return;
        }
        this._token.set(response.access);
        this._refreshToken.set(response.refresh);
        this._isLoggedIn.set(true);
      }),
    );
  }

  loginWithOAuth(provider: string, code: string) {
    return this.http
      .post<{ access: string; refresh: string }>(`${environment.apiUrl}/auth/oauth/${provider}/callback/`, { code })
      .pipe(
        tap((response) => {
          this._token.set(response.access);
          this._refreshToken.set(response.refresh);
          this._isLoggedIn.set(true);
        }),
      );
  }

  register(payload: RegisterPayload) {
    return this.http.post(`${environment.apiUrl}/register/`, payload);
  }

  refreshAccessToken() {
    return this.http
      .post<{ access: string }>(`${environment.apiUrl}/token/refresh/`, { refresh: this._refreshToken() })
      .pipe(
        tap((response) => {
          this._token.set(response.access);
        }),
      );
  }
  completeTwoFactorLogin(token: string) {
    this._token.set(token);
    this._isLoggedIn.set(true);
  }
  logout() {
    this._token.set(null);
    this._refreshToken.set(null);
    this._isLoggedIn.set(false);
  }
}

export interface LoginModel {
  email: string;
  password: string;
}

export interface RegisterFormModel {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

// export type LoginResponse = { token: string } | { requires2FA: true; tempToken: string };
export type LoginResponse =
  | { access: string; refresh: string }
  | { requires2FA: true; tempToken: string };
