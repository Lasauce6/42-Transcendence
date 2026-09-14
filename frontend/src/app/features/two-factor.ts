import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TwoFactor {
  http = inject(HttpClient);

  setupTwoFactor() {
    return this.http.post<TwoFactorSetupResponse>('/api/auth/2fa/setup/', {});
  }
  confirmTwoFactorSetup(code: string) {
    return this.http.post<TwoFactorConfirmResponse>('/api/auth/2fa/confirm/', { code });
  }
  verifyLogin(tempToken: string, code: string) {
    return this.http.post<TwoFactorVerifyLogin>('/api/auth/2fa/verify/', { tempToken, code });
  }
}

interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

interface TwoFactorConfirmResponse {
  success: boolean;
}

interface TwoFactorVerifyLogin {
  token: string;
}
