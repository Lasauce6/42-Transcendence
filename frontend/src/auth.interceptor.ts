import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './app/features/auth/auth';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  if (token && req.url.startsWith('/api')) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(cloned).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return authService.refreshAccessToken().pipe(
            switchMap(() => {
              const retried = req.clone({
                setHeaders: { Authorization: `Bearer ${authService.token()}` },
              });
              return next(retried);
            }),
            catchError((refreshError) => {
              authService.logout();
              return throwError(() => refreshError);
            }),
          );
        }
        return throwError(() => error);
      }),
    );
  }

  return next(req);
};
