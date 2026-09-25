import { Component, signal, effect, inject } from '@angular/core';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Header } from "./features/header/header";
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from './shared/components/language-switcher/language-switcher';
import { CurrentUser } from '@core/services/current-user';
import { AuthService } from '@features/auth/auth';
import { Toast } from './shared/components/toast/toast';
import { NotificationBell } from '@features/notifications/notification-bell/notification-bell';
import { NotificationService } from '@core/services/notification';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslatePipe, LanguageSwitcher, Toast, NotificationBell],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly currentUser = inject(CurrentUser);

  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly isAdmin = this.currentUser.isAdmin;

  private readonly notifications = inject(NotificationService);

  constructor() {
    effect(() => {
      if (this.isLoggedIn()) {
        this.currentUser.load().subscribe({ error: () => {} });
        this.notifications.load().subscribe({ error: () => {} });
      } else {
        this.currentUser.clear();
        this.notifications.clear();
      }
    });
  }
}