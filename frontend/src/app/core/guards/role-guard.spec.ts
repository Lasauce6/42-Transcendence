import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { UserProfile, UserRole } from '@core/models/user.model';
import { CurrentUser } from '@core/services/current-user';
import { AuthService } from '@features/auth/auth';
import { roleGuard } from './role-guard';

const profile = (role: UserRole): UserProfile => ({
  id: '1',
  username: 'dems',
  email: 'dems@example.com',
  avatarUrl: null,
  role,
});

describe('roleGuard', () => {
  const setup = (opts: { isLoggedIn: boolean; role?: UserRole; failing?: boolean }) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: signal(opts.isLoggedIn) } },
        {
          provide: CurrentUser,
          useValue: {
            load: () =>
              opts.failing
                ? throwError(() => new Error('me failed'))
                : of(profile(opts.role ?? 'USER')),
          },
        },
      ],
    });
  };

  const run = (roles: UserRole[] | undefined, url = '/admin') =>
    TestBed.runInInjectionContext(() =>
      roleGuard(
        { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot,
      ),
    );

  it('redirige vers /login si pas connecté', () => {
    setup({ isLoggedIn: false });
    const result = run(['ADMIN']);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/login');
  });

  it('laisse passer un ADMIN sur une route ADMIN', async () => {
    setup({ isLoggedIn: true, role: 'ADMIN' });
    await expect(firstValueFrom(run(['ADMIN']) as never)).resolves.toBe(true);
  });

  it('renvoie vers /forbidden si le rôle ne correspond pas', async () => {
    setup({ isLoggedIn: true, role: 'USER' });
    const result = await firstValueFrom(run(['ADMIN']) as never);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/forbidden');
  });

  it('accepte plusieurs rôles autorisés', async () => {
    setup({ isLoggedIn: true, role: 'MODERATOR' });
    await expect(firstValueFrom(run(['ADMIN', 'MODERATOR']) as never)).resolves.toBe(true);
  });

  it('laisse passer si la route ne déclare aucun rôle', () => {
    setup({ isLoggedIn: true, role: 'USER' });
    expect(run(undefined)).toBe(true);
  });

  it('refuse (403) si /me échoue', async () => {
    setup({ isLoggedIn: true, failing: true });
    const result = await firstValueFrom(run(['ADMIN']) as never);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/forbidden');
  });
});
