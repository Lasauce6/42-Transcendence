import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentUser } from '@core/services/current-user';

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
  private readonly currentUser = inject(CurrentUser); // déjà présent
  private readonly _tempToken = signal<string | null>(null);
  readonly tempToken = this._tempToken.asReadonly();

  login(credentials: LoginModel) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/users/auth/login/`, credentials)
      .pipe(
        tap((response) => {
          this._tempToken.set(null);
          if (response.two_fa_pending) {
            this._tempToken.set(response.access);
            return;
          }
          this._token.set(response.access);
          this._refreshToken.set(response.refresh);
          this._isLoggedIn.set(true);
          this.currentUser.load().subscribe(); // <-- ajout
        }),
      );
  }

  loginWithOAuth(provider: string, code: string) {
    return this.http
      .post<{
        access: string;
        refresh: string;
      }>(`${environment.apiUrl}/auth/oauth/${provider}/callback/`, { code })
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
      .post<{
        access: string;
      }>(`${environment.apiUrl}/token/refresh/`, { refresh: this._refreshToken() })
      .pipe(
        tap((response) => {
          this._token.set(response.access);
        }),
      );
  }
  completeTwoFactorLogin(access: string, refresh: string) {
    this._token.set(access);
    this._refreshToken.set(refresh);
    this._tempToken.set(null);
    this._isLoggedIn.set(true);
    this.currentUser.load().subscribe();
  }
  logout() {
    this._token.set(null);
    this._refreshToken.set(null);
    this._tempToken.set(null);
    this._isLoggedIn.set(false);
    this.currentUser.clear();
  }
}

export interface LoginModel {
  username: string;
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

export interface LoginResponse {
  access: string;
  refresh: string;
  two_fa_pending: boolean;
}
