import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class TwoFactor {
  http = inject(HttpClient);

  setupTwoFactor() {
    return this.http.post<TwoFactorSetupResponse>(`${environment.apiUrl}/users/me/2fa/setup/`, {});
  }
  confirmTwoFactorSetup(code: string) {
    return this.http.post<TwoFactorConfirmResponse>(
      `${environment.apiUrl}/users/me/2fa/verify-setup/`,
      {
        code,
      },
    );
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
  qr_code: string;
  uri: string;
}

interface TwoFactorConfirmResponse {
  backup_codes: string[];
}

interface TwoFactorVerifyLogin {
  access: string;
  refresh: string;
  two_fa_pending: boolean;
}
