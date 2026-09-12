import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth/auth';

@Component({
  selector: 'app-oauth-callback',
  imports: [],
  templateUrl: './oauth-callback.html',
  styleUrl: './oauth-callback.scss',
})
export class OauthCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  ngOnInit() {
    const provider = this.route.snapshot.paramMap.get('provider');
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const error = this.route.snapshot.queryParamMap.get('error');
    const savedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');

    if (error) {
      console.error('Autorisation refusée par le provider :', error);
      return;
    }

    if (state !== savedState) {
      console.error('State invalide, rejet du callback');
      return;
    }
    if (!code || !provider) {
      console.error('Code ou provider manquant');
      return;
    }

    this.authService.loginWithOAuth(provider, code).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => console.error("Échec de l'authentification OAuth"),
    });
  }
}
