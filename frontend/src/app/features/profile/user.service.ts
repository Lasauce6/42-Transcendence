import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);

  getMe() {
    return this.http.get<UserProfile>(`${environment.apiUrl}/users/me/`);
  }
  updateMe(payload: UpdateProfilePayload) {
    return this.http.patch<UserProfile>(`${environment.apiUrl}/users/me/`, payload);
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
