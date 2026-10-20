import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, tap } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatService } from '@core/services/chat';
import {
  UiAlert,
  UiAvatar,
  UiBadge,
  UiButton,
  UiCard,
  UiEmptyState,
  UiField,
  UiIcon,
  UiListItem,
  UiPageHeader,
  UiSpinner,
} from '@shared/ui';
import { FriendRow, FriendsService, friendsErrorKey } from './friends.service';
import { Friendship } from './friend.models';

@Component({
  selector: 'app-friends',
  imports: [
    TranslatePipe,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiButton,
    UiCard,
    UiEmptyState,
    UiField,
    UiIcon,
    UiListItem,
    UiPageHeader,
    UiSpinner,
  ],
  templateUrl: './friends.html',
})
export class Friends implements OnInit {
  private readonly friendsService = inject(FriendsService);
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);

  protected readonly friendRows = this.friendsService.friendRows;
  protected readonly receivedRows = this.friendsService.receivedRows;
  protected readonly sentRows = this.friendsService.sentRows;
  protected readonly onlineCount = computed(() => this.friendsService.onlineRows().length);

  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly newUsername = signal('');

  ngOnInit() {
    this.friendsService
      .load()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ error: (e) => this.error.set(friendsErrorKey(e)) });
  }

  protected accept(f: Friendship) {
    this.run(this.friendsService.accept(f.id));
  }

  protected reject(f: Friendship) {
    this.run(this.friendsService.reject(f.id));
  }

  protected remove(f: Friendship) {
    this.run(this.friendsService.remove(f.id));
  }

  protected add() {
    const username = this.newUsername().trim();
    if (!username) return;
    this.run(this.friendsService.addByUsername(username).pipe(tap(() => this.newUsername.set(''))));
  }

  // Ouvre (ou crée) la conversation privée avec cet ami.
  protected message(row: FriendRow) {
    this.run(
      this.chat
        .openPrivate(row.userId)
        .pipe(tap((channel) => this.router.navigate(['/chat', channel.id]))),
    );
  }

  private run(action$: Observable<unknown>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    action$
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({ error: (e) => this.error.set(friendsErrorKey(e)) });
  }
}
