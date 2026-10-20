import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@env/environment';
import { map, of, switchMap, tap, throwError } from 'rxjs';
import { CurrentUser } from '@core/services/current-user';
import { FriendUser, Friendship } from './friend.models';

export interface FriendRow {
  friendship: Friendship;
  userId: string;
  username: string;
  avatar: FriendUser['avatar'];
  online: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FriendsService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = inject(CurrentUser);
  private readonly url = `${environment.apiUrl}/friendships/`;

  private readonly _friendships = signal<Friendship[]>([]);
  readonly friendships = this._friendships.asReadonly();

  // Présence reçue en direct par le websocket ; prioritaire sur is_online de l'API.
  private readonly _online = signal<Record<string, boolean>>({});

  readonly received = computed(() =>
    this.filter((f, me) => f.status === 'PENDING' && f.addressee === me),
  );
  readonly sent = computed(() =>
    this.filter((f, me) => f.status === 'PENDING' && f.requester === me),
  );
  readonly friends = computed(() => this.filter((f) => f.status === 'ACCEPTED'));

  readonly friendRows = computed(() => this.rows(this.friends()));
  readonly receivedRows = computed(() => this.rows(this.received()));
  readonly sentRows = computed(() => this.rows(this.sent()));

  load() {
    return this.http.get<Friendship[]>(this.url).pipe(tap((list) => this._friendships.set(list)));
  }

  accept(id: string) {
    return this.http
      .post<Friendship>(`${this.url}${id}/accept/`, {})
      .pipe(
        tap((updated) =>
          this._friendships.update((list) => list.map((f) => (f.id === updated.id ? updated : f))),
        ),
      );
  }

  reject(id: string) {
    return this.http.post<void>(`${this.url}${id}/reject/`, {}).pipe(tap(() => this.drop(id)));
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.url}${id}/`).pipe(tap(() => this.drop(id)));
  }

  sendRequest(addresseeId: string) {
    return this.http
      .post<Friendship>(this.url, { addressee: addresseeId })
      .pipe(tap((created) => this._friendships.update((list) => [...list, created])));
  }

  // Envoie une demande à partir d'un pseudo, avec des erreurs traduisibles.
  addByUsername(username: string) {
    const name = username.trim().toLowerCase();
    if (name === this.currentUser.profile()?.username.toLowerCase()) {
      return throwError(() => 'FRIENDS.ERROR_SELF');
    }
    const known = this._friendships().some((f) =>
      [f.requester_user.username, f.addressee_user.username].some((u) => u.toLowerCase() === name),
    );
    if (known) {
      return throwError(() => 'FRIENDS.ERROR_ALREADY');
    }
    return this.findUserId(name).pipe(switchMap((id) => this.sendRequest(id)));
  }

  findUserId(username: string) {
    return this.http
      .get<{ id: string; username: string }[]>(`${environment.apiUrl}/users/`, {
        params: { search: username },
      })
      .pipe(
        map((list) => list.find((u) => u.username.toLowerCase() === username.toLowerCase())?.id),
        switchMap((id) => (id ? of(id) : throwError(() => 'FRIENDS.USER_NOT_FOUND'))),
      );
  }

  otherUser(f: Friendship): FriendUser {
    return f.requester === this.currentUser.profile()?.id ? f.addressee_user : f.requester_user;
  }

  // Appelé par le websocket des notifications quand un ami se connecte ou se déconnecte.
  setPresence(userId: string, isOnline: boolean) {
    this._online.update((m) => ({ ...m, [userId]: isOnline }));
  }

  // Vide tout à la déconnexion.
  reset() {
    this._friendships.set([]);
    this._online.set({});
  }

  private filter(keep: (f: Friendship, me: string) => boolean): Friendship[] {
    const me = this.currentUser.profile()?.id;
    return me ? this._friendships().filter((f) => keep(f, me)) : [];
  }

  private drop(id: string) {
    this._friendships.update((list) => list.filter((f) => f.id !== id));
  }

  private rows(list: Friendship[]): FriendRow[] {
    const online = this._online();
    return list.map((f) => {
      const user = this.otherUser(f);
      return {
        friendship: f,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        online: online[user.id] ?? user.is_online,
      };
    });
  }
}

// Message d'erreur à afficher (clé de traduction).
export function friendsErrorKey(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof HttpErrorResponse && e.status === 400) return 'FRIENDS.ERROR_REQUEST';
  return 'ERRORS.GENERIC';
}
