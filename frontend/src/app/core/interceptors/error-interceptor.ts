import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '@core/services/toast';

const SILENT_STATUSES = [400, 401, 422];

function messageKey(status: number): string {
  if (status === 0) {
    return 'TOAST.ERROR.NETWORK';
  }
  if (status === 403) {
    return 'TOAST.ERROR.FORBIDDEN';
  }
  if (status === 404) {
    return 'TOAST.ERROR.NOT_FOUND';
  }
  if (status >= 500) {
    return 'TOAST.ERROR.SERVER';
  }
  return 'TOAST.ERROR.GENERIC';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        req.url.startsWith('/api') &&
        !SILENT_STATUSES.includes(error.status)
      ) {
        toast.error(messageKey(error.status));
      }

      return throwError(() => error);
    }),
  );
};

