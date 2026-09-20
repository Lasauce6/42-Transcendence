import { Component, inject, OnInit, Signal, signal } from '@angular/core';
import { TwoFactor } from '../two-factor';
import {
  form,
  maxLength,
  minLength,
  pattern,
  required,
  validate,
  FormField,
} from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-two-factor-setup',
  imports: [FormField, TranslatePipe],
  templateUrl: './two-factor-setup.html',
  styleUrl: './two-factor-setup.scss',
})
export class TwoFactorSetup implements OnInit {
  private readonly twofactor = inject(TwoFactor);

  readonly qrcodeurl = signal<string | null>(null);
  readonly httpError = signal<string | null>(null);

  readonly codeData = signal({
    code: '',
  });
  readonly confirmed = signal(false);
  readonly confirmError = signal<string | null>(null);

  onSubmit() {
    this.twofactor.confirmTwoFactorSetup(this.codeData().code).subscribe({
      next: () => {
        this.confirmed.set(true);
      },
      error: () => {
        this.confirmError.set('ERRORS.INVALID_CODE');
      },
    });
  }
  readonly twoFactorForm = form(this.codeData, (path) => {
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

  ngOnInit() {
    this.twofactor.setupTwoFactor().subscribe({
      next: (response) => {
        this.qrcodeurl.set(response.qrCodeUrl);
      },
      error: (httpError) => {
        this.httpError.set('ERRORS.QRCODE_FAILED');
      },
    });
  }
}
