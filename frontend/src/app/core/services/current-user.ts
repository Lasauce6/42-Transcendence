import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { hasRole, UserProfile, UserRole } from '@core/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class CurrentUser {
  private readonly http = inject(HttpClient);

  private readonly _profile = signal<UserProfile | null>(null);
  readonly profile = this._profile.asReadonly();

  readonly role = computed<UserRole | null>(() => this._profile()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  private request$: Observable<UserProfile> | null = null;

  load(): Observable<UserProfile> {
    const cached = this._profile();
    if (cached) {
      return of(cached); 
    }

    this.request$ ??= this.http.get<UserProfile>('/api/users/me/').pipe(
      tap((user) => this._profile.set(user)),
      catchError((error) => {
        this.request$ = null; // on ne met jamais une erreur en cache
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.request$;
  }

  can(allowed: readonly UserRole[]): boolean {
    return hasRole(this.role(), allowed);
  }

  clear(): void {
    this._profile.set(null);
    this.request$ = null;
  }
}

