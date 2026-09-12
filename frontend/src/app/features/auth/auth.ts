import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  http = inject(HttpClient);
  private readonly _isLoggedIn = signal<boolean>(false);
  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  private readonly _token = signal<string | null>(null);
  readonly token = this._token.asReadonly();

  login(credentials: LoginModel) {
    return this.http.post<{ token: string }>('...', credentials).pipe(
      tap((response) => {
        this._token.set(response.token);
        this._isLoggedIn.set(true);
      }),
    );
  }

  loginWithOAuth(provider: string, code: string) {
    return this.http
      .post<{ token: string }>(`/api/auth/oauth/${provider}/callback/`, { code })
      .pipe(
        tap((response) => {
          this._token.set(response.token);
          this._isLoggedIn.set(true);
        }),
      );
  }

  register(payload: RegisterPayload) {
    return this.http.post('/api/register/', payload);
  }

  logout() {
    this._token.set(null);
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
