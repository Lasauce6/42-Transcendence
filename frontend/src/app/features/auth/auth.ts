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

  login(credentials: LoginModel) {
    return this.http.post<{ access: string; refresh: string }>('/api/token/', credentials).pipe(
      tap((response) => {
        this._isLoggedIn.set(true);
        localStorage.setItem('access', response.access);
        localStorage.setItem('refresh', response.refresh);
      }),
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post('/api/register/', payload);
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
