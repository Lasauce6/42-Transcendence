import { Component, inject, signal } from '@angular/core';
import { required, email, form, FormField, submit, validate } from '@angular/forms/signals';
import { AuthService, RegisterFormModel } from '../auth';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  readonly registerData = signal<RegisterFormModel>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMessage = signal<string>('');
  readonly registerForm = form(this.registerData, (path) => {
    required(path.username);
    required(path.email);
    email(path.email);
    required(path.password);
    validate(path.confirmPassword, ({ value, valueOf }) => {
      if (value() !== valueOf(path.password))
        return { kind: 'passwordMismatch', message: 'Les mots de passe ne correspondent pas' };
      else return;
    });
  });

  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.registerForm, async () => {
      try {
        this.errorMessage.set('');
        const { confirmPassword, ...payload } = this.registerData();
        await firstValueFrom(this.authService.register(payload));
        this.router.navigate(['/login']);
      } catch (error) {
        this.errorMessage.set('Une erreur est survenue, réessayez.');
      }
    });
  }
}
