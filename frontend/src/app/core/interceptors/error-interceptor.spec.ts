import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@core/services/toast';

import { errorInterceptor } from './error-interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const failWith = (url: string, status: number) => {
    http.get(url).subscribe({ error: () => {} });
    httpMock.expectOne(url).flush('nope', { status, statusText: 'Error' });
  };

  it('affiche un toast sur une 500', () => {
    failWith('/api/users/me/', 500);

    expect(toasts.toasts()[0].key).toBe('TOAST.ERROR.SERVER');
  });

  it('affiche un toast spécifique sur une 403', () => {
    failWith('/api/admin/users/', 403);

    expect(toasts.toasts()[0].key).toBe('TOAST.ERROR.FORBIDDEN');
  });

  it('reste silencieux sur une 401 (gérée par authInterceptor)', () => {
    failWith('/api/users/me/', 401);

    expect(toasts.toasts()).toHaveLength(0);
  });

  it('reste silencieux sur une 400 (erreurs de formulaire)', () => {
    failWith('/api/auth/register/', 400);

    expect(toasts.toasts()).toHaveLength(0);
  });

  it('ignore les requêtes hors /api', () => {
    failWith('/i18n/es.json', 404);

    expect(toasts.toasts()).toHaveLength(0);
  });
});

