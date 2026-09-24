import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '@core/services/notification';

@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  private readonly notifications = inject(NotificationService);
  readonly unreadCount = this.notifications.unreadCount;
}
