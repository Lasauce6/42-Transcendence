import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  UiAlert,
  UiAvatar,
  UiButton,
  UiCard,
  UiEmptyState,
  UiField,
  UiIcon,
  UiListItem,
  UiPageHeader,
  UiSpinner,
} from '@shared/ui';
import { Channel } from '@core/models/chat.model';
import { ChatService } from '@core/services/chat';
import { CurrentUser } from '@core/services/current-user';

@Component({
  selector: 'app-chat-list',
  imports: [DatePipe, TranslatePipe, UiAlert, UiAvatar, UiButton, UiCard, UiEmptyState, UiField, UiIcon, UiListItem, UiPageHeader, UiSpinner],
  templateUrl: './chat-list.html',
})
export class ChatList implements OnInit {
  private readonly service = inject(ChatService);
  private readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly query = signal('');

  readonly newUsername = signal('');
  readonly creating = signal(false);
  readonly createError = signal(false);

  readonly channels = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.service.channels();
    return q ? list.filter((c) => this.displayName(c).toLowerCase().includes(q)) : list;
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service.loadChannels().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  displayName(c: Channel): string {
    return this.service.displayName(c);
  }

  avatarOf(c: Channel): string | null {
    return this.service.avatarOf(c);
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  open(c: Channel): void {
    this.router.navigate(['/chat', c.id]);
  }

  onNewUsernameInput(event: Event): void {
    this.newUsername.set((event.target as HTMLInputElement).value);
    this.createError.set(false);
  }

  startConversation(): void {
    const username = this.newUsername().trim();
    if (!username || this.creating()) return;

    this.creating.set(true);
    this.createError.set(false);
    this.service.startConversation(username).subscribe({
      next: (channel) => {
        this.creating.set(false);
        this.newUsername.set('');
        this.router.navigate(['/chat', channel.id]);
      },
      error: () => {
        this.creating.set(false);
        this.createError.set(true);
      },
    });
  }
}
