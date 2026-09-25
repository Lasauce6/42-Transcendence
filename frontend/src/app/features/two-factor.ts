import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class TwoFactor {
  http = inject(HttpClient);

  setupTwoFactor() {
    return this.http.post<TwoFactorSetupResponse>(`${environment.apiUrl}/auth/2fa/setup/`, {});
  }
  confirmTwoFactorSetup(code: string) {
    return this.http.post<TwoFactorConfirmResponse>(`${environment.apiUrl}/auth/2fa/confirm/`, {
      code,
    });
  }
  verifyLogin(tempToken: string, code: string) {
    return this.http.post<TwoFactorVerifyLogin>(`${environment.apiUrl}/users/auth/2fa/verify/`, {
      temp_token: tempToken,
      code,
    });
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
  access: string;
  refresh: string;
  two_fa_pending: boolean;
}
