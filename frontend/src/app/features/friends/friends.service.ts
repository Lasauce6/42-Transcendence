import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@env/environment';
import { Friendship } from './friend.models';
import { of, tap } from 'rxjs';
import { CurrentUser } from '@core/services/current-user';
import { UserProfile } from '@core/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class FriendsService {
  private readonly http = inject(HttpClient);
  private readonly _profiles = signal<Record<string, UserProfile>>({});
  readonly profiles = this._profiles.asReadonly();
  private readonly _friendships = signal<Friendship[]>([]);
  readonly friendships = this._friendships.asReadonly();
  private readonly currentUser = inject(CurrentUser);
  readonly received = computed(() => {
    const me = this.currentUser.profile()?.id;
    if (!me) return [];
    return this._friendships().filter((f) => f.status === 'PENDING' && f.addressee === me);
  });
  readonly sent = computed(() => {
    const me = this.currentUser.profile()?.id;
    if (!me) return [];
    return this._friendships().filter((f) => f.status === 'PENDING' && f.requester === me);
  });

  readonly friends = computed(() => {
    const me = this.currentUser.profile()?.id;
    if (!me) return [];
    return this._friendships().filter(
      (f) => f.status === 'ACCEPTED' && (f.addressee === me || f.requester === me),
    );
  });
  load() {
    return this.http.get<Friendship[]>(`${environment.apiUrl}/friendships/`).pipe(
      tap((response) => {
        this._friendships.set(response);
      }),
    );
  }
  accept(id: string) {
    return this.http.post<Friendship>(`${environment.apiUrl}/friendships/${id}/accept/`, {}).pipe(
      tap((response) => {
        this._friendships.update((list) => list.map((f) => (f.id === response.id ? response : f)));
      }),
    );
  }
  reject(id: string) {
    return this.http.post<void>(`${environment.apiUrl}/friendships/${id}/reject/`, {}).pipe(
      tap(() => {
        this._friendships.update((list) => list.filter((f) => f.id !== id));
      }),
    );
  }
  remove(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/friendships/${id}/`).pipe(
      tap(() => {
        this._friendships.update((list) => list.filter((f) => f.id !== id));
      }),
    );
  }

  sendRequest(addresseeId: string) {
    return this.http
      .post<Friendship>(`${environment.apiUrl}/friendships/`, { addressee: addresseeId })
      .pipe(
        tap((response) => {
          this._friendships.update((list) => [...list, response]);
        }),
      );
  }

  loadProfile(userId: string) {
    const cached = this._profiles()[userId];
    if (cached) return of(cached);

    return this.http.get<UserProfile>(`${environment.apiUrl}/users/${userId}/`).pipe(
      tap((profile) => {
        this._profiles.update((cache) => ({ ...cache, [userId]: profile }));
      }),
    );
  }

  otherUserId(f: Friendship): string | undefined {
    const me = this.currentUser.profile()?.id;
    if (!me) return undefined;
    return f.requester === me ? f.addressee : f.requester;
  }
}
