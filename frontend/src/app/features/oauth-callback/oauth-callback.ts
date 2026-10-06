import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth/auth';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-oauth-callback',
  imports: [TranslatePipe],
  templateUrl: './oauth-callback.html',
  styleUrl: './oauth-callback.scss',
})
export class OauthCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  ngOnInit() {
    const access = this.route.snapshot.queryParamMap.get('access');
    const refresh = this.route.snapshot.queryParamMap.get('refresh');
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error) {
      console.error('Autorisation refusée par le provider :', error);
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    if (!access || !refresh) {
      console.error('Tokens manquants dans le callback OAuth');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.authService.setTokens(access, refresh);
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
