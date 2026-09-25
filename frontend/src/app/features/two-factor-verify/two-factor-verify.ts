import { Component, inject, signal } from '@angular/core';
import { form, required, minLength, maxLength, pattern, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { TwoFactor } from '../two-factor';
import { AuthService } from '../auth/auth';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-two-factor-verify',
  imports: [FormField, TranslatePipe],
  templateUrl: './two-factor-verify.html',
  styleUrl: './two-factor-verify.scss',
})
export class TwoFactorVerify {
  readonly twofactor = inject(TwoFactor);
  private readonly authService = inject(AuthService);
  readonly verifyError = signal<string | null>(null);
  readonly codeData = signal({ code: '' });
  private readonly router = inject(Router);
  readonly tempToken = this.authService.tempToken;
  readonly verifyForm = form(this.codeData, (path) => {
    required(path.code, {
      message: 'Le code est requis',
    });
    minLength(path.code, 6, {
      message: 'Le code doit faire 6 chiffres',
    });
    maxLength(path.code, 6, {
      message: 'Le code doit faire 6 chiffres',
    });
    pattern(path.code, /^\d{6}$/, {
      message: 'Seuls les chiffres sont autorisés',
    });
  });
  constructor() {
    if (!this.tempToken()) {
      this.router.navigate(['/login']);
    }
  }

  onSubmit() {
    const tempToken = this.tempToken();

    if (!tempToken) {
      this.router.navigate(['/login']);
      return;
    }

    this.twofactor.verifyLogin(tempToken, this.codeData().code).subscribe({
      next: (response) => {
        this.authService.completeTwoFactorLogin(response.access, response.refresh);
        this.router.navigate(['/']);
      },
      error: () => {
        this.verifyError.set('ERRORS.INVALID_CODE');
      },
    });
  }
}
