import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Channel } from '@core/models/chat.model';
import { AppNotification } from '@core/models/notification.model';
import { ChatService } from '@core/services/chat';
import { CurrentUser } from '@core/services/current-user';
import { NotificationService } from '@core/services/notification';
import { AuthService } from '@features/auth/auth';
import { UiButton, UiCard, UiEmptyState, UiIcon, UiListItem, UiPageHeader, UiSpinner } from '@shared/ui';

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink, TranslatePipe, UiButton, UiCard, UiEmptyState, UiIcon, UiListItem, UiPageHeader, UiSpinner],
  templateUrl: './home.html',
})
export class Home {
  private readonly currentUser = inject(CurrentUser);
  private readonly chat = inject(ChatService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoggedIn = inject(AuthService).isLoggedIn;
  readonly profile = this.currentUser.profile;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly channels = computed(() => this.chat.channels().slice(0, 5));
  readonly notifications = computed(() => this.notificationService.notifications().slice(0, 4));
  readonly loadingChannels = signal(true);

  readonly features = [
    { icon: 'message', key: 'CHAT' },
    { icon: 'paperclip', key: 'FILES' },
    { icon: 'users', key: 'FRIENDS' },
  ];

  constructor() {
    effect(() => {
      if (this.isLoggedIn()) {
        this.chat.loadChannels().subscribe({
          next: () => this.loadingChannels.set(false),
          error: () => this.loadingChannels.set(false),
        });
      }
    });
  }

  channelName(c: Channel): string {
    return c.name ?? '';
  }

  notificationKey(n: AppNotification): string {
    const action = String(n.payload?.['action'] ?? 'DEFAULT').toUpperCase();
    return `NOTIFICATIONS.ITEM.${n.type}.${action}`;
  }

  notificationParams(n: AppNotification): Record<string, unknown> {
    return { username: n.payload?.['from_username'] ?? '?' };
  }
}
