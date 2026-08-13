import { Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  imports: [TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  // TODO: remplacer par le user du service auth (ticket auth)
  readonly user = signal({ login: 'user42' });
}

