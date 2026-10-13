import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@env/environment';
import { Observable, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { CurrentUser } from '@core/services/current-user';
import { UserProfile } from '@core/models/user.model';
import { Friendship } from './friend.models';

export interface FriendRow {
  friendship: Friendship;
  userId: string;
  username: string;
  avatar: UserProfile['avatar'];
  online: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FriendsService {
  private readonly http = inject(HttpClient);
  private readonly _profiles = signal<Record<string, UserProfile>>({});
  readonly profiles = this._profiles.asReadonly();
  private readonly _friendships = signal<Friendship[]>([]);
  readonly friendships = this._friendships.asReadonly();
  private readonly _online = signal<Record<string, boolean>>({});
  private readonly inFlight = new Map<string, Observable<UserProfile>>();
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
  readonly friendRows = computed(() => this.rows(this.friends()));
  readonly receivedRows = computed(() => this.rows(this.received()));
  readonly sentRows = computed(() => this.rows(this.sent()));
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

  const pending = this.inFlight.get(userId);
  if (pending) return pending;

  const req$ = this.http.get<UserProfile>(`${environment.apiUrl}/users/${userId}/`).pipe(
    tap((profile) => this._profiles.update((cache) => ({ ...cache, [userId]: profile }))),
    finalize(() => this.inFlight.delete(userId)),
    shareReplay(1),
  );
  this.inFlight.set(userId, req$);
  return req$;
}

  otherUserId(f: Friendship): string | undefined {
    const me = this.currentUser.profile()?.id;
    if (!me) return undefined;
    return f.requester === me ? f.addressee : f.requester;
  }
  // À CONFIRMER : endpoint et paramètre de recherche côté backend
findUserId(username: string) {
  return this.http
    .get<{ id: string; username: string }[]>(`${environment.apiUrl}/users/`, {
      params: { search: username },
    })
    .pipe(
      map((list) => list.find((u) => u.username.toLowerCase() === username.toLowerCase())?.id),
      switchMap((id) =>
        id
          ? of(id)
          : throwError(
              () =>
                new HttpErrorResponse({ status: 404, error: { detail: 'FRIENDS.USER_NOT_FOUND' } }),
            ),
      ),
    );
}

// À appeler depuis le service WebSocket (#15)
setPresence(userId: string, isOnline: boolean) {
  this._online.update((m) => ({ ...m, [userId]: isOnline }));
}

// À appeler depuis la déconnexion (#17)
reset() {
  this._friendships.set([]);
  this._profiles.set({});
  this._online.set({});
  this.inFlight.clear();
}

private rows(list: Friendship[]): FriendRow[] {
  const profiles = this._profiles();
  const online = this._online();
  return list.flatMap((f) => {
    const id = this.otherUserId(f);
    const p = id ? profiles[id] : undefined;
    return id && p
      ? [{ friendship: f, userId: id, username: p.username, avatar: p.avatar, online: online[id] ?? false }]
      : [];
  });
}
}
