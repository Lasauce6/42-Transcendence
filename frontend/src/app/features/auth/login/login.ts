import { Component, inject, signal } from '@angular/core';
import { required, email, form, FormField, submit } from '@angular/forms/signals';
import { AuthService, LoginModel } from '../auth';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  readonly errorMessage = signal<string>('');
  readonly loginData = signal<LoginModel>({
    email: '',
    password: '',
  });
  readonly loginForm = form(this.loginData, (path) => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.loginForm, async () => {
      try {
        this.errorMessage.set('');
        await firstValueFrom(this.authService.login(this.loginData()));
      } catch (error) {
        this.errorMessage.set('Identifiants invalides.');
      }
    });
  }
}
