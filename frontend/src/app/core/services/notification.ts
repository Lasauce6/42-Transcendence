import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, map, Observable, of, tap } from 'rxjs';
import { environment } from '@env/environment';
import { AppNotification } from '@core/models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notifications/`;

  private readonly _notifications = signal<AppNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(
    () => this._notifications().filter((n) => !n.is_read).length,
  );

  load(): Observable<AppNotification[]> {
    return this.http
      .get<AppNotification[]>(this.url)
      .pipe(tap((list) => this._notifications.set(list)));
  }

  markAsRead(id: string): Observable<AppNotification> {
    return this.http
      .patch<AppNotification>(`${this.url}${id}/`, { is_read: true })
      .pipe(tap((updated) => this.replace(updated)));
  }

  markAllAsRead(): Observable<void> {
    const unread = this._notifications().filter((n) => !n.is_read);
    if (unread.length === 0) {
      return of(undefined);
    }
    return forkJoin(unread.map((n) => this.markAsRead(n.id))).pipe(map(() => undefined));
  }

  add(notification: AppNotification): void {
    this._notifications.update((list) => [
      notification,
      ...list.filter((n) => n.id !== notification.id),
    ]);
  }

  clear(): void {
    this._notifications.set([]);
  }

  private replace(updated: AppNotification): void {
    this._notifications.update((list) =>
      list.map((n) => (n.id === updated.id ? updated : n)),
    );
  }
}

