import { Component, inject, signal } from '@angular/core';
import { form, required, minLength, maxLength, pattern, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { TwoFactor } from '../two-factor';
import { AuthService } from '../auth/auth';
import { TranslatePipe } from '@ngx-translate/core';
import { UiAlert, UiButton, UiField } from '@shared/ui';

@Component({
  selector: 'app-two-factor-verify',
  imports: [FormField, TranslatePipe, UiAlert, UiButton, UiField],
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
      message: 'ERRORS.CODE_REQUIRED',
    });
    minLength(path.code, 6, {
      message: 'ERRORS.CODE_LENGTH',
    });
    maxLength(path.code, 6, {
      message: 'ERRORS.CODE_LENGTH',
    });
    pattern(path.code, /^\d{6}$/, {
      message: 'ERRORS.CODE_DIGITS',
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
