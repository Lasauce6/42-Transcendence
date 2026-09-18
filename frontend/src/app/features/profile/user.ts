import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class User {
  private readonly http = inject(HttpClient);

  getMe() {
    return this.http.get<UserProfile>('/api/users/me/');
  }
  updateMe(payload: UpdateProfilePayload) {
    return this.http.patch<UserProfile>('/api/users/me/', payload);
  }
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
}
