import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, finalize, Observable, switchMap, tap } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatService } from '@core/services/chat';
import { CurrentUser } from '@core/services/current-user';
import { ToastService } from '@core/services/toast';
import { FriendsService, friendsErrorKey } from '@features/friends/friends.service';
import { Friendship } from '@features/friends/friend.models';
import {
  UiAlert,
  UiAvatar,
  UiBadge,
  UiButton,
  UiCard,
  UiIcon,
  UiPageHeader,
  UiSpinner,
} from '@shared/ui';
import { PublicProfile, UserService } from '../user.service';

// Lien entre moi et l'utilisateur affiché.
export type Relation = 'none' | 'friends' | 'sent' | 'received' | 'blocked';

@Component({
  selector: 'app-user-profile',
  imports: [
    DatePipe,
    TranslatePipe,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiButton,
    UiCard,
    UiIcon,
    UiPageHeader,
    UiSpinner,
  ],
  templateUrl: './user-profile.html',
})
export class UserProfile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(UserService);
  private readonly currentUser = inject(CurrentUser);
  private readonly friends = inject(FriendsService);
  private readonly chat = inject(ChatService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  // L'amitié avec cet utilisateur, s'il y en a une.
  protected readonly friendship = computed<Friendship | undefined>(() => {
    const id = this.profile()?.id;
    return this.friends.friendships().find((f) => f.requester === id || f.addressee === id);
  });

  protected readonly relation = computed<Relation>(() => {
    const f = this.friendship();
    if (!f) return 'none';
    if (f.status === 'ACCEPTED') return 'friends';
    if (f.status === 'BLOCKED') return 'blocked';
    return f.requester === this.profile()?.id ? 'received' : 'sent';
  });

  ngOnInit() {
    this.friends.load().subscribe({ error: () => undefined });

    // Le même composant sert quand on passe d'un profil à un autre.
    this.route.paramMap
      .pipe(
        tap(() => {
          this.profile.set(null);
          this.loadError.set(null);
          this.actionError.set(null);
        }),
        switchMap((params) => {
          const id = params.get('id') ?? '';
          return this.currentUser.load().pipe(
            switchMap((me) => {
              if (me.id !== id) return this.users.getUser(id);
              this.router.navigate(['/profile'], { replaceUrl: true });
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => this.profile.set(user),
        error: (e) =>
          this.loadError.set(
            e instanceof HttpErrorResponse && e.status === 404
              ? 'USER_PROFILE.UNAVAILABLE'
              : 'PROFILE.LOAD_FAILED',
          ),
      });
  }

  protected add(user: PublicProfile) {
    this.run(this.friends.sendRequest(user.id), 'TOAST.SUCCESS.FRIEND_REQUEST_SENT');
  }

  protected accept(f: Friendship) {
    this.run(this.friends.accept(f.id), 'TOAST.SUCCESS.FRIEND_ACCEPTED');
  }

  protected reject(f: Friendship) {
    this.run(this.friends.reject(f.id), 'TOAST.SUCCESS.FRIEND_REJECTED');
  }

  protected remove(f: Friendship) {
    this.run(this.friends.remove(f.id), 'TOAST.SUCCESS.FRIEND_REMOVED');
  }

  protected message(user: PublicProfile) {
    this.run(
      this.chat
        .openPrivate(user.id)
        .pipe(tap((channel) => this.router.navigate(['/chat', channel.id]))),
    );
  }

  private run(action$: Observable<unknown>, successKey?: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    action$.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (successKey) this.toast.success(successKey);
      },
      error: (e) => this.actionError.set(friendsErrorKey(e)),
    });
  }
}
