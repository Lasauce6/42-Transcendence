import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { hasRole, UserRole } from '@core/models/user.model';
import { CurrentUser } from '@core/services/current-user';
import { AuthService } from '@features/auth/auth';

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const currentUser = inject(CurrentUser);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
  }

  const allowed = (route.data['roles'] as UserRole[] | undefined) ?? [];
  if (allowed.length === 0) {
    return true; // aucune contrainte déclarée : authGuard suffisait
  }

  return currentUser.load().pipe(
    map((user) => (hasRole(user.role, allowed) ? true : router.createUrlTree(['/forbidden']))),
    catchError(() => of(router.createUrlTree(['/forbidden']))),
  );
};
