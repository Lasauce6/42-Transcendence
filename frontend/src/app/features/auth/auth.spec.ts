import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CurrentUser } from '@core/services/current-user';

import { AuthService } from './auth';
import { environment } from '@env/environment';

const profile = {
  id: '1',
  username: 'dems',
  email: 'dems@example.com',
  first_name: '',
  last_name: '',
  bio: '',
  avatar: null,
  role: 'ADMIN' as const,
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('login() stocke le token et passe isLoggedIn à true', () => {
    service.login({ username: 'dems', password: 'secret' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/users/auth/login/`);
    expect(req.request.method).toBe('POST');
    req.flush({ access: 'access-token', refresh: 'refresh-token' });
    http.expectOne(`${environment.apiUrl}/users/me/`).flush(profile); // login() déclenche le chargement du profil

    expect(service.token()).toBe('access-token');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('login() en 2FA ne connecte pas encore', () => {
    service.login({ username: 'dems', password: 'secret' }).subscribe();
    http
      .expectOne(`${environment.apiUrl}/users/auth/login/`)
      .flush({ access: 'tmp', refresh: '', two_fa_pending: true });

    expect(service.isLoggedIn()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.tempToken()).toBe('tmp');
  });

  it('setTokens() connecte et charge le profil courant', () => {
    service.setTokens('access-token', 'refresh-token');

    expect(service.token()).toBe('access-token');
    expect(service.isLoggedIn()).toBe(true);

    const req = http.expectOne(`${environment.apiUrl}/users/me/`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: '1',
      username: 'dems',
      email: 'dems@example.com',
      first_name: '',
      last_name: '',
      bio: '',
      avatar: null,
      role: 'USER',
    });
    expect(service.isLoggedIn()).toBe(true);
  });

  it('logout() remet le token et isLoggedIn à zéro', () => {
    service.login({ username: 'dems', password: 'secret' }).subscribe();
    http.expectOne(`${environment.apiUrl}/users/auth/login/`).flush({ access: 'a', refresh: 'r' });
    http.expectOne(`${environment.apiUrl}/users/me/`).flush(profile); // login() déclenche le chargement du profil

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('logout() vide aussi le profil courant (#48)', () => {
    const currentUser = TestBed.inject(CurrentUser);

    service.login({ username: 'dems', password: 'secret' }).subscribe();
    http.expectOne(`${environment.apiUrl}/users/auth/login/`).flush({ access: 'a', refresh: 'r' });
    http.expectOne(`${environment.apiUrl}/users/me/`).flush(profile); // login() déclenche le chargement du profil
    expect(currentUser.isAdmin()).toBe(true);

    service.logout();

    expect(currentUser.profile()).toBeNull();
  });
});
