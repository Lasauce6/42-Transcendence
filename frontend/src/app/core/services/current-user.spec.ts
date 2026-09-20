import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserProfile } from '@core/models/user.model';
import { CurrentUser } from './current-user';

const profile: UserProfile = {
  id: '1',
  username: '42',
  email: '42@example.com',
  avatarUrl: null,
  role: 'ADMIN',
};

describe('CurrentUser', () => {
  let service: CurrentUser;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CurrentUser);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('charge le profil et expose isAdmin', () => {
    service.load().subscribe();
    http.expectOne('/api/users/me/').flush(profile);

    expect(service.role()).toBe('ADMIN');
    expect(service.isAdmin()).toBe(true);
  });

  it('ne fait qu’un seul appel pour deux load() simultanés', () => {
    service.load().subscribe();
    service.load().subscribe();

    http.expectOne('/api/users/me/').flush(profile);
  });

  it('clear() vide le cache et autorise un nouvel appel', () => {
    service.load().subscribe();
    http.expectOne('/api/users/me/').flush(profile);

    service.clear();
    expect(service.profile()).toBeNull();

    service.load().subscribe();
    http.expectOne('/api/users/me/').flush(profile);
  });
});
