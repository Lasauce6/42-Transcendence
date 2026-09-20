import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CurrentUser } from '@core/services/current-user';

import { AuthService } from './auth';

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
    service.login({ email: 'dems@example.com', password: 'secret' }).subscribe();

    const req = http.expectOne('/api/token/');
    expect(req.request.method).toBe('POST');
    req.flush({ access: 'access-token', refresh: 'refresh-token' });

    expect(service.token()).toBe('access-token');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('login() en 2FA ne connecte pas encore', () => {
    service.login({ email: 'dems@example.com', password: 'secret' }).subscribe();
    http.expectOne('/api/token/').flush({ requires2FA: true, tempToken: 'tmp' });

    expect(service.isLoggedIn()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('logout() remet le token et isLoggedIn à zéro', () => {
    service.login({ email: 'dems@example.com', password: 'secret' }).subscribe();
    http.expectOne('/api/token/').flush({ access: 'a', refresh: 'r' });

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('logout() vide aussi le profil courant (#48)', () => {
    const currentUser = TestBed.inject(CurrentUser);

    currentUser.load().subscribe();
    http.expectOne('/api/users/me/').flush({
      id: '1',
      username: 'dems',
      email: 'dems@example.com',
      avatarUrl: null,
      role: 'ADMIN',
    });
    expect(currentUser.isAdmin()).toBe(true);

    service.logout();

    expect(currentUser.profile()).toBeNull();
  });
});

