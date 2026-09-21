import { Component, inject, signal } from '@angular/core';
import { required, form, FormField, submit, maxLength } from '@angular/forms/signals';
import { AuthService, LoginModel } from '../auth';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMessage = signal<string>('');
  readonly loginData = signal<LoginModel>({
    username: '',
    password: '',
  });
  readonly loginForm = form(this.loginData, (path) => {
    required(path.username);
    required(path.password);
    maxLength(path.password, 72, { message: 'Mot de passe trop long' });
  });

  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.loginForm, async () => {
      try {
        this.errorMessage.set('');
        const response = await firstValueFrom(this.authService.login(this.loginData()));
        if ('requires2FA' in response) {
          this.router.navigate(['/auth/2fa/verify'], {
            state: { tempToken: response.tempToken },
          });
        } else {
          this.router.navigate(['/']);
        }
      } catch (error) {
        this.errorMessage.set('ERRORS.INVALID_CREDENTIALS');
      }
    });
  }
  onOAuthLogin(provider: 'google' | 'github' | 'fortytwo') {
    const backendProvider = provider === 'fortytwo' ? '42' : provider;

    window.location.href = `${window.location.origin}/${environment.apiUrl}/auth/oauth/${backendProvider}/login/`;
  }
}
