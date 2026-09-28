import { Component, inject, signal } from '@angular/core';
import { CurrentUser } from '@core/services/current-user';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  imports: [TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly currentUser = inject(CurrentUser);
  readonly profile = this.currentUser.profile;
}
