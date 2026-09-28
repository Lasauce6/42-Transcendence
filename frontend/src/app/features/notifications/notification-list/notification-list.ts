import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AppNotification } from '@core/models/notification.model';
import { NotificationService } from '@core/services/notification';

@Component({
  selector: 'app-notification-list',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class NotificationList implements OnInit {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);

  readonly notifications = this.service.notifications;
  readonly unreadCount = this.service.unreadCount;

  ngOnInit(): void {
    this.service.load().subscribe({ error: () => {} });
  }

  labelKey(n: AppNotification): string {
    const action = String(n.payload?.['action'] ?? 'DEFAULT').toUpperCase();
    return `NOTIFICATIONS.ITEM.${n.type}.${action}`;
  }

  labelParams(n: AppNotification): Record<string, unknown> {
    return { username: n.payload?.['from_username'] ?? '?' };
  }

  open(n: AppNotification): void {
    if (!n.is_read) {
      this.service.markAsRead(n.id).subscribe({ error: () => {} });
    }
    if (n.entity_type === 'Friendship') {
      this.router.navigate(['/profile']);
    }
  }

  markAll(): void {
    this.service.markAllAsRead().subscribe({ error: () => {} });
  }
}
