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
  updateMe(payload: UpdateProfilePayload, avatar?: File | null) {
    if (!avatar) {
      return this.http.patch<UserProfile>(`${environment.apiUrl}/users/me/`, payload);
    }

    const formData = new FormData();

    if (payload.username !== undefined) {
      formData.append('username', payload.username);
    }
    if (payload.first_name !== undefined) {
      formData.append('first_name', payload.first_name);
    }
    if (payload.last_name !== undefined) {
      formData.append('last_name', payload.last_name);
    }
    if (payload.bio !== undefined) {
      formData.append('bio', payload.bio);
    }

    formData.append('avatar', avatar);

    return this.http.patch<UserProfile>(`${environment.apiUrl}/users/me/`, formData);
  }
  changePassword(payload: ChangePasswordPayload) {
    return this.http.post<void>(`${environment.apiUrl}/users/change_password/`, payload);
  }
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar: string | null;
  role: string;
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}
