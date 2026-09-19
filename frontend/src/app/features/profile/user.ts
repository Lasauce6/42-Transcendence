import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserProfile } from '@core/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class User {
  private readonly http = inject(HttpClient);

  getMe() {
    return this.http.get<UserProfile>('/api/users/me/');
  }
}

export type { UserProfile } from '@core/models/user.model';