import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '@features/auth/auth';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const setup = (isLoggedIn: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: signal(isLoggedIn) } },
      ],
    });
  };

  const run = (url = '/profile') =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  it('laisse passer un utilisateur connecté', () => {
    setup(true);
    expect(run()).toBe(true);
  });

  it('redirige vers /login si pas connecté', () => {
    setup(false);
    const result = run('/profile');

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/login');
  });

  it('conserve l’URL demandée dans redirectTo', () => {
    setup(false);
    const result = run('/profile') as UrlTree;

    expect(result.queryParams['redirectTo']).toBe('/profile');
  });
});
